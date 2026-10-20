import 'dotenv/config';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { Logger } from '@nestjs/common';
import { Reader } from 'mmdb-lib';
import { GEO_FILES } from '../rate-limit/geo-files.js';

/**
 * Télécharge les bases DB-IP Lite du mois (« IP to ASN » et « IP to Country », CC BY 4.0, mention
 * de DB-IP.com obligatoire) dans `${STORAGE_DIR}/geo`, puis redémarrer l'API pour les recharger.
 * Mois courant, sinon le précédent (publication en début de mois). À lancer chaque mois (cron).
 *
 *   node dist/maintenance/update-geo.js
 */
const logger = new Logger('UpdateGeo');

const SOURCES = {
  asn: (month: string) => `https://download.db-ip.com/free/dbip-asn-lite-${month}.mmdb.gz`,
  country: (month: string) => `https://download.db-ip.com/free/dbip-country-lite-${month}.mmdb.gz`,
} as const;

function months(): string[] {
  const now = new Date();
  const previous = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return [now, previous].map((d) => d.toISOString().slice(0, 7));
}

async function download(kind: keyof typeof SOURCES): Promise<{ data: Buffer; month: string }> {
  for (const month of months()) {
    const res = await fetch(SOURCES[kind](month), { signal: AbortSignal.timeout(120_000) });
    if (!res.ok) continue;
    const data = gunzipSync(Buffer.from(await res.arrayBuffer()));
    // Contrôle avant remplacement : une base illisible ne doit jamais écraser la bonne.
    new Reader(data);
    return { data, month };
  }
  throw new Error(`Base DB-IP « ${kind} » introuvable pour ${months().join(' ou ')}`);
}

async function main(): Promise<void> {
  const dir = join(resolve(process.env.STORAGE_DIR ?? './storage'), 'geo');
  mkdirSync(dir, { recursive: true });
  for (const kind of ['asn', 'country'] as const) {
    const { data, month } = await download(kind);
    const target = join(dir, GEO_FILES[kind]);
    writeFileSync(`${target}.tmp`, data);
    renameSync(`${target}.tmp`, target);
    logger.log(`DB-IP ${kind} (${month}) : ${(data.length / 1e6).toFixed(1)} Mo → ${target}`);
  }
}

main().catch((err: unknown) => {
  logger.error((err as Error).message);
  process.exit(1);
});
