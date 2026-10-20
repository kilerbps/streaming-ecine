import { createHmac } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import type { RateLimitReason } from '@ecine/contracts';
import { ENV, type Env } from '../config/env.js';
import { ProblemException } from '../common/problem.js';
import { RedisService } from '../redis/redis.service.js';
import { gcraParams } from './gcra.js';
import { GcraStore } from './gcra-store.js';
import { GeoService, type IpClass } from './geo.service.js';
import { limitedIp } from './ip.js';
import {
  DEVICE_VERIFIED_TTL_SEC,
  GENERAL,
  HOUR,
  KEYS_PER_IDENTITY,
  MINUTE,
  PER_SESSION,
  PREVIEW_SESSIONS,
  SENSITIVE_IP_FACTOR,
  SESSION_OPEN,
  VERIFIED_DEVICES_PER_IP,
  type ByClass,
} from './policies.js';

/** Réseau du visiteur : IP regroupée, empreintes du jour, classe et ASN. */
export interface Network {
  ipKey: string | null;
  block48Key: string | null;
  ipClass: IpClass;
  asn: number | null;
}

/**
 * Identité de limite (ADR-0015), de la plus à la moins favorable : compte, appareil vérifié
 * (Turnstile), appareil neuf ; sans appareil, l'adresse IP tient lieu d'appareil neuf.
 */
export interface Identity extends Network {
  kind: 'account' | 'verified' | 'unverified';
  /** Clé opaque : `a:` compte, `d:` appareil, `i:` adresse. Jamais d'identifiant en clair. */
  key: string;
  hasDevice: boolean;
  deviceAgeSec: number | null;
}

export interface LimitRule {
  key: string;
  limit: number;
  periodMs: number;
  burst?: number;
  reason: RateLimitReason;
}

/** Options d'une route sensible (`@SensitiveLimit`). */
export interface SensitiveOptions {
  limit: number;
  ttlMs: number;
  /** Plafond par IP et par classe ; par défaut, la limite × `SENSITIVE_IP_FACTOR`. */
  ip?: ByClass;
  /** Refusée quand Redis est indisponible (inscription, contact). */
  failClosed?: boolean;
}

const MESSAGES: Record<RateLimitReason, string> = {
  identity: 'Trop de demandes depuis cet appareil. Réessayez dans un instant.',
  pot_ip: 'Beaucoup de demandes depuis votre réseau. Une vérification rapide permet de continuer.',
  verify: 'Une vérification rapide est nécessaire pour continuer.',
  ip: 'Votre réseau envoie beaucoup de demandes. Réessayez dans un instant.',
  concurrent: 'Trop de lectures en même temps sur ce compte ou cet appareil.',
  session: 'Trop de requêtes de lecture.',
};

const NETWORK = Symbol('rateLimitNetwork');
const ACTIVE_TTL_MS = 15 * MINUTE;

/**
 * Limites de débit par identité (ADR-0015). En mode `observe` (lancement), les limites liées à
 * l'identité journalisent « aurait bloqué » sans bloquer ; restent toujours appliqués : plafonds
 * anti-inondation, vérification des IP d'hébergeurs, routes sensibles, quotas par session.
 */
@Injectable()
export class RateLimitService {
  private readonly logger = new Logger('RateLimit');
  readonly enforcing: boolean;
  private day = '';
  private dayKey: Buffer = Buffer.alloc(0);

  constructor(
    private readonly store: GcraStore,
    private readonly redis: RedisService,
    private readonly geo: GeoService,
    @Inject(ENV) private readonly env: Env,
  ) {
    this.enforcing = env.RATE_LIMIT_MODE === 'enforce';
  }

  /** Vrai si Redis répond (routes fermées en cas de panne). */
  get shared(): boolean {
    return this.store.shared;
  }

  /** Empreinte stable d'un compte ou d'un appareil. */
  private stableHash(value: string): string {
    return createHmac('sha256', this.env.IP_HASH_SALT)
      .update(`rl-id:${value}`)
      .digest('base64url')
      .slice(0, 22);
  }

  /** Empreinte d'une adresse avec un secret qui change chaque jour (pas de réversion des IPv4). */
  private ipHash(value: string): string {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.day) {
      this.day = today;
      this.dayKey = createHmac('sha256', this.env.IP_HASH_SALT).update(`rl-ip:${today}`).digest();
    }
    return createHmac('sha256', this.dayKey).update(value).digest('base64url').slice(0, 22);
  }

  network(req: Request): Network {
    const holder = req as unknown as Record<symbol, Network | undefined>;
    const cached = holder[NETWORK];
    if (cached) return cached;
    const ip = limitedIp(req.clientIp);
    const { ipClass, asn } = this.geo.classify(ip);
    const network: Network = {
      ipKey: ip ? this.ipHash(ip.key) : null,
      block48Key: ip?.block48 ? this.ipHash(ip.block48) : null,
      ipClass,
      asn,
    };
    holder[NETWORK] = network;
    return network;
  }

  /** À appeler après l'authentification (le compte prime sur l'appareil). */
  identify(req: Request): Identity {
    const network = this.network(req);
    const now = Math.floor(Date.now() / 1000);
    const device = req.device;
    const base = {
      ...network,
      hasDevice: Boolean(device),
      deviceAgeSec: device ? Math.max(0, now - device.issuedAt) : null,
    };
    if (req.user) return { ...base, kind: 'account', key: `a:${this.stableHash(req.user.id)}` };
    if (device) {
      return {
        ...base,
        kind: device.verifiedUntil > now ? 'verified' : 'unverified',
        key: `d:${this.stableHash(device.id)}`,
      };
    }
    return { ...base, kind: 'unverified', key: `i:${network.ipKey ?? 'inconnue'}` };
  }

  /**
   * Applique des règles ensemble (une règle refusée ne consomme rien ailleurs). `always` : appliquée
   * même en observation. `failClosed` : refusée si Redis est indisponible.
   */
  async consume(
    policy: string,
    identity: Network & Partial<Identity>,
    rules: LimitRule[],
    options: { always?: boolean; failClosed?: boolean } = {},
  ): Promise<void> {
    if (options.failClosed && !this.store.shared) throw ProblemException.serviceUnavailable();
    const active = rules.filter((rule) => rule.limit > 0);
    const outcome = await this.store.take(
      active.map((rule) => ({ key: `${policy}:${rule.key}`, params: gcraParams(rule) })),
    );
    if (outcome.allowed) return;
    const rule = active[outcome.index]!;
    this.refuse(policy, identity, rule.reason, outcome.retryAfterMs, rule.key, options.always);
  }

  /** Journalise un refus ; le transforme en 429 si les limites sont appliquées. */
  refuse(
    policy: string,
    identity: Network & Partial<Identity>,
    reason: RateLimitReason,
    retryAfterMs: number,
    key: string,
    always = false,
  ): void {
    const enforce = this.enforcing || always;
    this.logger.warn(
      {
        rateLimit: {
          policy,
          reason,
          outcome: enforce ? 'blocked' : 'would_block',
          keyType: key.split(':')[0],
          key: key.slice(0, 10),
          retryAfterMs,
          identity: identity.kind ?? null,
          ipClass: identity.ipClass,
          asn: identity.asn,
          deviceAgeH:
            identity.deviceAgeSec === null || identity.deviceAgeSec === undefined
              ? null
              : Math.floor(identity.deviceAgeSec / 3600),
        },
      },
      enforce ? 'Limite de débit atteinte' : 'Limite de débit atteinte (observation, non bloquée)',
    );
    if (enforce) {
      throw ProblemException.tooManyRequests(MESSAGES[reason], {
        reason,
        retryAfter: retryAfterMs / 1000,
      });
    }
  }

  /** Plafond anti-inondation par IP (et par /48 en IPv6), toujours appliqué. */
  async flood(network: Network): Promise<void> {
    const rules: LimitRule[] = [];
    if (network.ipKey) {
      rules.push({
        key: `ip:${network.ipKey}`,
        limit: GENERAL.ip[network.ipClass],
        periodMs: MINUTE,
        reason: 'ip',
      });
    }
    if (network.block48Key) {
      rules.push({
        key: `48:${network.block48Key}`,
        limit: GENERAL.identity * GENERAL.block48Factor,
        periodMs: MINUTE,
        reason: 'ip',
      });
    }
    await this.consume('flood', network, rules, { always: true });
  }

  /** Plafond par IP d'une route sensible, toujours appliqué. */
  async sensitiveIp(route: string, identity: Identity, options: SensitiveOptions): Promise<void> {
    if (!identity.ipKey) return;
    const limit =
      options.ip?.[identity.ipClass] ?? options.limit * SENSITIVE_IP_FACTOR[identity.ipClass];
    await this.consume(
      `sensitive:${route}`,
      identity,
      [{ key: `ip:${identity.ipKey}`, limit, periodMs: options.ttlMs, reason: 'ip' }],
      { always: true, failClosed: options.failClosed },
    );
  }

  /**
   * Ouverture d'une session de lecture : identité, pot commun des appareils neufs de l'IP, plafond
   * global de l'IP, sessions simultanées. Une IP d'hébergeur exige un appareil vérifié.
   */
  async sessionOpen(identity: Identity, preview: boolean): Promise<void> {
    if (identity.ipClass === 'hosting' && identity.kind === 'unverified') {
      this.refuse('session-open', identity, 'verify', 0, identity.key, true);
    }
    if (preview) {
      await this.consume('preview-session', identity, [
        { key: identity.key, ...PREVIEW_SESSIONS, reason: 'identity' },
      ]);
      return;
    }
    const periodMs = SESSION_OPEN.periodMs;
    const rules: LimitRule[] = [
      {
        key: identity.key,
        limit: SESSION_OPEN.identity[identity.kind],
        periodMs,
        reason: 'identity',
      },
    ];
    if (identity.ipKey) {
      if (identity.kind === 'unverified') {
        rules.push({
          key: `pot:${identity.ipKey}`,
          limit: SESSION_OPEN.newDevicePot[identity.ipClass],
          periodMs,
          reason: 'pot_ip',
        });
      }
      rules.push({
        key: `ip:${identity.ipKey}`,
        limit: await this.ipCeiling(identity),
        periodMs,
        reason: 'ip',
      });
    }
    await this.assertConcurrency(identity);
    await this.consume('session-open', identity, rules);
    if (identity.kind === 'verified') await this.markSeen(identity);
  }

  /** RDC : max(plancher ; facteur × appareils vérifiés vus derrière l'IP en 1 à 2 h). */
  private async ipCeiling(identity: Identity): Promise<number> {
    const floor = SESSION_OPEN.ipFloor[identity.ipClass];
    if (identity.ipClass !== 'rdc' || !identity.ipKey) return floor;
    const seen = await this.verifiedDevicesSeen(identity.ipKey);
    return Math.max(floor, SESSION_OPEN.verifiedDeviceFactor * seen);
  }

  private hllKeys(ipKey: string): [string, string] {
    const hour = Math.floor(Date.now() / HOUR);
    return [`rl:hll:${ipKey}:${hour}`, `rl:hll:${ipKey}:${hour - 1}`];
  }

  /** Appareil vérifié vu derrière son IP (HyperLogLog, 12 Ko au plus par clé). */
  private async markSeen(identity: Identity): Promise<void> {
    if (!identity.ipKey || !this.redis.ready) return;
    const [current] = this.hllKeys(identity.ipKey);
    await this.redis.client
      .multi()
      .pfadd(current, identity.key)
      .pexpire(current, 2 * HOUR)
      .exec()
      .catch(() => undefined);
  }

  private async verifiedDevicesSeen(ipKey: string): Promise<number> {
    if (!this.redis.ready) return 0;
    return this.redis.client.pfcount(...this.hllKeys(ipKey)).catch(() => 0);
  }

  private async assertConcurrency(identity: Identity): Promise<void> {
    // Sans compte ni appareil, l'IP n'identifie personne (CGNAT) : pas de compte de sessions.
    if (identity.kind !== 'account' && !identity.hasDevice) return;
    const limit =
      identity.kind === 'account'
        ? SESSION_OPEN.concurrent.account
        : SESSION_OPEN.concurrent.device;
    if ((await this.activeSessions(identity.key)) < limit) return;
    this.refuse('session-open', identity, 'concurrent', MINUTE, identity.key);
  }

  private async activeSessions(identityKey: string): Promise<number> {
    if (!this.redis.ready) return 0;
    const key = `rl:active:${identityKey}`;
    try {
      const [, count] = (await this.redis.client
        .multi()
        .zremrangebyscore(key, '-inf', Date.now())
        .zcard(key)
        .exec()) as [unknown, [Error | null, number]];
      return Number(count[1] ?? 0);
    } catch {
      return 0;
    }
  }

  /**
   * Session présente jusqu'à l'expiration de son jeton renouvelé : seule une lecture réelle (au moins
   * un renouvellement, ~4 min) compte parmi les sessions simultanées, pas une ouverture abandonnée.
   */
  async trackSession(identityKey: string, sessionId: string, expiresAt: Date): Promise<void> {
    if (!this.redis.ready) return;
    const key = `rl:active:${identityKey}`;
    await this.redis.client
      .multi()
      .zadd(key, expiresAt.getTime(), sessionId)
      .zremrangebyscore(key, '-inf', Date.now())
      .pexpire(key, ACTIVE_TTL_MS)
      .exec()
      .catch(() => undefined);
  }

  /** Quotas d'une session de lecture : protègent les contenus, toujours appliqués. */
  async sessionQuota(
    kind: keyof typeof PER_SESSION,
    sessionId: string,
    identityKey?: string,
  ): Promise<void> {
    const rules: LimitRule[] = [{ key: sessionId, ...PER_SESSION[kind], reason: 'session' }];
    if (kind === 'keys' && identityKey) {
      rules.push({ key: `id:${identityKey}`, ...KEYS_PER_IDENTITY, reason: 'identity' });
    }
    await this.consume(
      `play-${kind}`,
      { ipKey: null, block48Key: null, ipClass: 'other', asn: null },
      rules,
      {
        always: true,
      },
    );
  }

  /**
   * Vérification Turnstile réussie : l'appareil devient « vérifié » pour 24 h. Le nombre de
   * nouveaux appareils vérifiés par IP et par heure est limité (fermes de robots).
   * Renvoie la fin de vérification, en secondes depuis l'époque.
   */
  async verifyDevice(identity: Identity): Promise<number> {
    if (identity.ipKey) {
      await this.consume('device-verify', identity, [
        {
          key: `ip:${identity.ipKey}`,
          limit: VERIFIED_DEVICES_PER_IP[identity.ipClass],
          periodMs: HOUR,
          reason: 'ip',
        },
      ]);
    }
    await this.markSeen(identity);
    return Math.floor(Date.now() / 1000) + DEVICE_VERIFIED_TTL_SEC;
  }
}
