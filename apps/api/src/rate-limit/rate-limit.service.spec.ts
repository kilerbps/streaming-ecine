import { describe, expect, it } from 'vitest';
import type { Request } from 'express';
import { ProblemException } from '../common/problem.js';
import { GcraStore } from './gcra-store.js';
import type { IpClass } from './geo.service.js';
import { RateLimitService, type Identity } from './rate-limit.service.js';

const NOW_SEC = Math.floor(Date.now() / 1000);

/** Service sans Redis (repli local) ; classe d'IP imposée. */
function service(mode: 'observe' | 'enforce', ipClass: IpClass = 'rdc') {
  const redis = { ready: false, client: {} };
  const geo = { classify: () => ({ ipClass, asn: 37020 }) };
  return new RateLimitService(
    new GcraStore(redis as never),
    redis as never,
    geo as never,
    { RATE_LIMIT_MODE: mode, IP_HASH_SALT: 'sel-de-test-suffisamment-long-pour-le-hmac' } as never,
  );
}

function request(
  options: { device?: string; verified?: boolean; user?: string; ip?: string } = {},
) {
  return {
    clientIp: options.ip ?? '41.243.10.10',
    user: options.user ? { id: options.user } : undefined,
    device: options.device
      ? {
          id: options.device.padEnd(22, 'A'),
          issuedAt: NOW_SEC - 3600,
          verifiedUntil: options.verified ? NOW_SEC + 3600 : 0,
        }
      : undefined,
  } as unknown as Request;
}

async function reason(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    if (error instanceof ProblemException)
      return error.problem.reason ?? `statut ${error.problem.status}`;
    throw error;
  }
}

/** Ouvre `count` sessions pour la même identité ; renvoie le motif du premier refus. */
async function open(limits: RateLimitService, identity: Identity, count: number) {
  for (let i = 0; i < count; i += 1) {
    const refused = await reason(limits.sessionOpen(identity, false));
    if (refused) return { opened: i, refused };
  }
  return { opened: count, refused: null };
}

describe('identité de limite', () => {
  it('préfère le compte, puis l’appareil, puis l’adresse, sans identifiant en clair', () => {
    const limits = service('enforce');
    const account = limits.identify(request({ user: 'u1', device: 'D' }));
    expect(account.kind).toBe('account');
    expect(account.key).toMatch(/^a:/);
    expect(account.key).not.toContain('u1');
    expect(limits.identify(request({ device: 'D', verified: true })).kind).toBe('verified');
    expect(limits.identify(request({ device: 'D' })).kind).toBe('unverified');
    const anonymous = limits.identify(request());
    expect(anonymous.key).toMatch(/^i:/);
    expect(anonymous.key).not.toContain('41.243');
  });
});

describe('ouverture des sessions de lecture', () => {
  it('limite un appareil neuf (rafale de 3), sans bloquer en observation', async () => {
    const enforced = service('enforce');
    expect(await open(enforced, enforced.identify(request({ device: 'D' })), 10)).toEqual({
      opened: 3,
      refused: 'identity',
    });
    const observed = service('observe');
    expect(await open(observed, observed.identify(request({ device: 'D' })), 10)).toEqual({
      opened: 10,
      refused: null,
    });
  });

  it('jeter son cookie ramène au pot commun de l’IP, que les appareils vérifiés ne vident pas', async () => {
    const limits = service('enforce');
    // 75 appareils neufs d'un coup (rafale du pot RDC de 150), le 76e est refusé.
    for (let i = 0; i < 75; i += 1) {
      expect(
        await reason(limits.sessionOpen(limits.identify(request({ device: `N${i}` })), false)),
      ).toBeNull();
    }
    expect(
      await reason(limits.sessionOpen(limits.identify(request({ device: 'N75' })), false)),
    ).toBe('pot_ip');
    // Un appareil vérifié derrière la même IP n'est pas concerné.
    expect(
      await reason(
        limits.sessionOpen(limits.identify(request({ device: 'V', verified: true })), false),
      ),
    ).toBeNull();
  });

  it('exige un appareil vérifié derrière une IP d’hébergeur, même en observation', async () => {
    const limits = service('observe', 'hosting');
    expect(await reason(limits.sessionOpen(limits.identify(request({ device: 'D' })), false))).toBe(
      'verify',
    );
    expect(
      await reason(
        limits.sessionOpen(limits.identify(request({ device: 'D', verified: true })), false),
      ),
    ).toBeNull();
  });
});

describe('limites toujours appliquées', () => {
  it('quotas par session de lecture (protection des contenus), même en observation', async () => {
    const limits = service('observe');
    const results: (string | null)[] = [];
    for (let i = 0; i < 4; i += 1) results.push(await reason(limits.sessionQuota('refresh', 's1')));
    expect(results).toEqual([null, null, 'session', 'session']);
  });

  it('plafond par IP d’une route sensible, même en observation', async () => {
    const limits = service('observe', 'hosting');
    const identity = limits.identify(request({ device: 'D' }));
    const options = { limit: 3, ttlMs: 3_600_000, ip: { rdc: 30, other: 10, hosting: 2 } };
    expect(await reason(limits.sensitiveIp('Auth.register', identity, options))).toBeNull();
    expect(await reason(limits.sensitiveIp('Auth.register', identity, options))).toBe('ip');
  });

  it('refuse une route « fermée en cas de panne » quand Redis est indisponible', async () => {
    const limits = service('observe');
    const identity = limits.identify(request({ device: 'D' }));
    expect(
      await reason(
        limits.sensitiveIp('Forms.contact', identity, { limit: 3, ttlMs: 1000, failClosed: true }),
      ),
    ).toBe('statut 503');
  });
});
