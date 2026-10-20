import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { Reader, type AsnResponse, type CountryResponse } from 'mmdb-lib';
import { ENV, type Env } from '../config/env.js';
import { storagePaths } from '../media/static.js';
import { GEO_FILES } from './geo-files.js';
import { HOSTING_ASNS } from './hosting-asns.js';
import type { LimitedIp } from './ip.js';

/** Classe de réseau d'une IP (ADR-0015) : RDC (plafond généreux), autres, hébergeurs (strict). */
export type IpClass = 'rdc' | 'other' | 'hosting';

/**
 * Bases DB-IP Lite (CC BY 4.0, mention de DB-IP.com obligatoire), mises à jour chaque mois par
 * `pnpm --filter @ecine/api geo:update`. Sans base, toute IP est « autres » : les limites restent
 * actives, seules les classes manquent.
 */
@Injectable()
export class GeoService implements OnModuleInit {
  private readonly logger = new Logger(GeoService.name);
  private readonly dir: string;
  private asn: Reader<AsnResponse> | null = null;
  private country: Reader<CountryResponse> | null = null;

  constructor(@Inject(ENV) env: Env) {
    this.dir = storagePaths(env).geo;
  }

  onModuleInit(): void {
    this.asn = this.open<AsnResponse>(GEO_FILES.asn);
    this.country = this.open<CountryResponse>(GEO_FILES.country);
    if (this.asn && this.country) {
      this.logger.log(
        `Bases DB-IP chargées (${this.asn.metadata.buildEpoch.toISOString().slice(0, 10)})`,
      );
    } else {
      this.logger.warn(
        `Bases DB-IP absentes de ${this.dir} : toutes les IP sont « autres » (pnpm --filter @ecine/api geo:update).`,
      );
    }
  }

  private open<T extends AsnResponse | CountryResponse>(file: string): Reader<T> | null {
    const path = join(this.dir, file);
    if (!existsSync(path)) return null;
    try {
      return new Reader<T>(readFileSync(path));
    } catch (err) {
      this.logger.error(`Base ${file} illisible : ${(err as Error).message}`);
      return null;
    }
  }

  classify(ip: LimitedIp | null): { ipClass: IpClass; asn: number | null } {
    if (!ip) return { ipClass: 'other', asn: null };
    let asn: number | null = null;
    try {
      asn = this.asn?.get(ip.address)?.autonomous_system_number ?? null;
      if (asn !== null && HOSTING_ASNS.has(asn)) return { ipClass: 'hosting', asn };
      const country = this.country?.get(ip.address)?.country?.iso_code;
      return { ipClass: country === 'CD' ? 'rdc' : 'other', asn };
    } catch {
      return { ipClass: 'other', asn };
    }
  }
}
