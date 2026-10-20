import { describe, expect, it } from 'vitest';
import type { Request } from 'express';
import { RELAY_HEADERS, relayCanonical } from '@ecine/contracts';
import { hmacHex } from './crypto.js';
import { RelayMiddleware } from './relay.middleware.js';

const KEY = 'cle-de-service-de-test-suffisamment-longue';
const DEVICE = 'AAAAAAAAAAAAAAAAAAAAAA.1800000000.0';

function relayed(
  overrides: { ts?: number; sign?: Partial<Record<'ip' | 'device', string>>; key?: string } = {},
) {
  const ts = String(overrides.ts ?? Date.now());
  const headers: Record<string, string> = {
    [RELAY_HEADERS.ip]: '41.243.10.10',
    [RELAY_HEADERS.userAgent]: 'Android',
    [RELAY_HEADERS.device]: DEVICE,
  };
  const signature = hmacHex(
    overrides.key ?? KEY,
    relayCanonical({
      timestamp: ts,
      method: 'POST',
      path: '/v1/playback/v1/session',
      ip: overrides.sign?.ip ?? headers[RELAY_HEADERS.ip],
      userAgent: 'Android',
      device: overrides.sign?.device ?? DEVICE,
    }),
  );
  headers[RELAY_HEADERS.signature] = `${ts}.${signature}`;
  return {
    method: 'POST',
    originalUrl: '/v1/playback/v1/session',
    ip: '10.0.0.5',
    headers,
  } as unknown as Request;
}

function run(req: Request): Request {
  new RelayMiddleware({ SERVICE_API_KEY: KEY } as never).use(req, {} as never, () => undefined);
  return req;
}

describe('relais signé du site vers l’API', () => {
  it('croit l’IP, l’agent et l’appareil relayés quand la signature est valide', () => {
    const req = run(relayed());
    expect(req.fromService).toBe(true);
    expect(req.relayedVisitor).toBe(true);
    expect(req.clientIp).toBe('41.243.10.10');
    expect(req.clientUserAgent).toBe('Android');
    expect(req.device?.id).toBe('AAAAAAAAAAAAAAAAAAAAAA');
  });

  it('ignore les en-têtes quand la signature vient d’une autre clé', () => {
    const req = run(relayed({ key: 'autre-cle-de-service-suffisamment-longue' }));
    expect(req.fromService).toBe(false);
    expect(req.clientIp).toBe('10.0.0.5');
    expect(req.device).toBeUndefined();
  });

  it('refuse une requête rejouée après 30 s', () => {
    expect(run(relayed({ ts: Date.now() - 31_000 })).fromService).toBe(false);
  });

  it('refuse une IP ou un appareil modifiés après la signature', () => {
    expect(run(relayed({ sign: { ip: '1.2.3.4' } })).fromService).toBe(false);
    expect(
      run(relayed({ sign: { device: 'BBBBBBBBBBBBBBBBBBBBBB.1800000000.0' } })).fromService,
    ).toBe(false);
  });
});
