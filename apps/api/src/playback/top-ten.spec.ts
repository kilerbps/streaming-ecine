import { describe, expect, it, vi } from 'vitest';
import { SchedulerService } from '../admin/scheduler.service.js';
import { capMaster } from './hls-rewrite.js';
import { PlaybackService } from './playback.service.js';

const MASTER = [
  '#EXTM3U',
  '#EXT-X-STREAM-INF:BANDWIDTH=150000,RESOLUTION=256x144',
  '144p/index.m3u8',
  '#EXT-X-STREAM-INF:BANDWIDTH=400000,RESOLUTION=426x240',
  '240p/index.m3u8',
  '#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720',
  '720p/index.m3u8',
].join('\n');

describe('aperçu automatique : manifeste plafonné', () => {
  it('ne garde que les rendus de 240p au plus', () => {
    const out = capMaster(MASTER, 240);
    expect(out).toContain('144p/index.m3u8');
    expect(out).toContain('240p/index.m3u8');
    expect(out).not.toContain('720p');
    expect(out).not.toContain('BANDWIDTH=2500000');
  });

  it('garde le plus bas rendu si aucun ne passe sous le plafond', () => {
    const only720 = ['#EXTM3U', '#EXT-X-STREAM-INF:BANDWIDTH=1', '720p/index.m3u8'].join('\n');
    expect(capMaster(only720, 240)).toContain('720p/index.m3u8');
  });
});

interface ViewRow {
  day: Date;
  filmId: string;
  viewerHash: string;
}

function playbackWith() {
  const prisma = {
    videoAsset: {
      findFirst: vi
        .fn()
        .mockResolvedValue({ id: 'v1', filmId: 'f1', hlsBasePath: 'x', keyId: null }),
    },
    playbackView: {
      createMany: vi
        .fn<(args: { data: ViewRow[] }) => Promise<{ count: number }>>()
        .mockResolvedValue({ count: 1 }),
    },
  };
  const cache = { wrap: (_ns: string, _key: string, _ttl: number, fn: () => unknown) => fn() };
  const limits = {
    sessionOpen: vi.fn().mockResolvedValue(undefined),
    trackSession: vi.fn().mockResolvedValue(undefined),
  };
  const tokens = { sign: vi.fn().mockResolvedValue({ token: 't', expiresAt: new Date() }) };
  const env = {
    IP_HASH_SALT: 'sel-de-test-suffisamment-long-pour-le-hmac',
    API_PUBLIC_URL: 'https://api.test',
    STORAGE_DIR: './storage',
  };
  const service = new PlaybackService(
    prisma as never,
    cache as never,
    limits as never,
    tokens as never,
    env as never,
  );
  return { prisma, tokens, limits, service };
}

describe('lectures comptées pour le Top 10', () => {
  const identity = {
    kind: 'unverified',
    key: 'i:x',
    hasDevice: false,
    deviceAgeSec: null,
    ipKey: 'x',
    block48Key: null,
    ipClass: 'rdc',
    asn: 37020,
  } as const;
  const viewer = { identity, ip: '41.243.0.1', userAgent: 'Android', userId: null, deviceId: null };

  it('compte une lecture avec une empreinte de 64 caractères, jamais l’adresse IP', async () => {
    const { prisma, service } = playbackWith();
    await service.createSession('v1', viewer);
    const data = prisma.playbackView.createMany.mock.calls[0]?.[0].data[0];
    expect(data?.filmId).toBe('f1');
    expect(data?.viewerHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(data)).not.toContain('41.243');
  });

  it('distingue deux appareils derrière la même IP et le même navigateur (CGNAT)', async () => {
    const { prisma, service } = playbackWith();
    await service.createSession('v1', { ...viewer, deviceId: 'AAAAAAAAAAAAAAAAAAAAAA' });
    await service.createSession('v1', { ...viewer, deviceId: 'BBBBBBBBBBBBBBBBBBBBBB' });
    const [a, b] = prisma.playbackView.createMany.mock.calls.map((c) => c[0].data[0]?.viewerHash);
    expect(a).not.toBe(b);
  });

  it('applique les limites par identité, sans compter une ouverture comme lecture en cours', async () => {
    const { limits, tokens, service } = playbackWith();
    await service.createSession('v1', viewer);
    expect(limits.sessionOpen).toHaveBeenCalledWith(identity, false);
    expect(tokens.sign).toHaveBeenCalledWith(expect.objectContaining({ identityKey: 'i:x' }));
    // Seul un renouvellement du jeton (~4 min de lecture) rend la session « présente ».
    expect(limits.trackSession).not.toHaveBeenCalled();
  });

  it('ne compte pas un aperçu automatique et marque son jeton', async () => {
    const { prisma, tokens, service } = playbackWith();
    await service.createSession('v1', viewer, true);
    expect(prisma.playbackView.createMany).not.toHaveBeenCalled();
    expect(tokens.sign).toHaveBeenCalledWith(expect.objectContaining({ preview: true }));
  });

  it('change d’empreinte d’un jour à l’autre pour le même spectateur', async () => {
    const { prisma, service } = playbackWith();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-15T10:00:00Z'));
    await service.createSession('v1', viewer);
    vi.setSystemTime(new Date('2026-10-16T10:00:00Z'));
    await service.createSession('v1', viewer);
    vi.useRealTimers();
    const [a, b] = prisma.playbackView.createMany.mock.calls.map((c) => c[0].data[0]?.viewerHash);
    expect(a).not.toBe(b);
  });
});

describe('calcul quotidien du Top 10', () => {
  function schedulerWith(existing: boolean) {
    const prisma = {
      film: { findMany: vi.fn().mockResolvedValue([]) },
      article: { findMany: vi.fn().mockResolvedValue([]) },
      post: { findMany: vi.fn().mockResolvedValue([]) },
      reminder: { findMany: vi.fn().mockResolvedValue([]) },
      topTenEntry: {
        findFirst: vi.fn().mockResolvedValue(existing ? { rank: 1 } : null),
        createMany: vi.fn().mockReturnValue('créer'),
        deleteMany: vi.fn().mockReturnValue('purger'),
      },
      playbackView: {
        groupBy: vi.fn().mockResolvedValue([
          { filmId: 'a', _count: { filmId: 12 } },
          { filmId: 'b', _count: { filmId: 5 } },
        ]),
        deleteMany: vi.fn().mockReturnValue('effacer'),
      },
      $transaction: vi.fn().mockResolvedValue([]),
    };
    const events = { changed: vi.fn() };
    const push = { sendToUser: vi.fn().mockResolvedValue(0) };
    const scheduler = new SchedulerService(
      prisma as never,
      { log: vi.fn() } as never,
      events as never,
      { send: vi.fn() } as never,
      push as never,
      { NODE_ENV: 'test', APP_URL: 'https://e-cine.test' } as never,
    );
    return { prisma, events, scheduler };
  }

  it('classe les films par spectateurs sur 7 jours et invalide l’accueil', async () => {
    const { prisma, events, scheduler } = schedulerWith(false);
    await scheduler.tick(new Date('2026-10-15T10:00:00Z'));
    expect(prisma.playbackView.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          day: { gte: new Date('2026-10-09T00:00:00Z') },
        }) as unknown,
        take: 10,
      }),
    );
    expect(prisma.topTenEntry.createMany).toHaveBeenCalledWith({
      data: [
        { day: new Date('2026-10-15T00:00:00Z'), rank: 1, filmId: 'a', viewers: 12 },
        { day: new Date('2026-10-15T00:00:00Z'), rank: 2, filmId: 'b', viewers: 5 },
      ],
      skipDuplicates: true,
    });
    expect(events.changed).toHaveBeenCalledWith('home');
  });

  it('ne recalcule pas un jour déjà calculé', async () => {
    const { prisma, scheduler } = schedulerWith(true);
    await scheduler.tick(new Date('2026-10-15T10:00:00Z'));
    expect(prisma.playbackView.groupBy).not.toHaveBeenCalled();
  });
});
