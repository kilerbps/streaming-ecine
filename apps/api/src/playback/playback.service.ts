import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { PLAYBACK_TOKEN_PARAM, type PlaybackRefresh, type PlaybackSession } from '@ecine/contracts';
import { ENV, type Env } from '../config/env.js';
import { hashIp, openSecret, randomToken } from '../common/crypto.js';
import { ProblemException } from '../common/problem.js';
import { playableWhere } from '../content/content.helpers.js';
import { storagePaths } from '../media/static.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CacheService } from '../redis/cache.service.js';
import { RedisThrottlerStorage } from '../redis/throttler-storage.js';
import { rewriteMaster, rewriteVariant } from './hls-rewrite.js';
import { PlaybackTokenService } from './playback-token.service.js';

/** Quotas anti-aspiration (docs/06-SECURITY.md §6.4). Une lecture normale charge ~10 à 20 segments/min. */
const QUOTAS = {
  sessionsPerIp: { limit: 40, ttlMs: 10 * 60_000 },
  refreshPerSession: { limit: 10, ttlMs: 5 * 60_000 },
  segmentsPerSession: { limit: 150, ttlMs: 60_000 },
  keysPerSession: { limit: 60, ttlMs: 5 * 60_000 },
} as const;
const REFRESH_GRACE_SEC = 10 * 60;

interface PlayableVideo {
  id: string;
  hlsBasePath: string;
  keyId: string | null;
}

@Injectable()
export class PlaybackService {
  private readonly logger = new Logger(PlaybackService.name);
  private readonly hlsRoot: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly quotas: RedisThrottlerStorage,
    private readonly tokens: PlaybackTokenService,
    @Inject(ENV) private readonly env: Env,
  ) {
    this.hlsRoot = storagePaths(env).hls;
  }

  async createSession(videoId: string, clientIp: string | undefined): Promise<PlaybackSession> {
    await this.playable(videoId);
    await this.enforce(
      'sessions-ip',
      hashIp(clientIp, this.env.IP_HASH_SALT) ?? 'inconnu',
      QUOTAS.sessionsPerIp,
    );
    const sessionId = randomToken(12);
    const { token, expiresAt } = await this.tokens.sign({ videoId, sessionId });
    return {
      sessionId,
      token,
      expiresAt: expiresAt.toISOString(),
      manifestUrl: `${this.env.API_PUBLIC_URL}/v1/playback/${videoId}/master.m3u8`,
    };
  }

  /** Renouvellement sans nouvelle autorisation lourde : ancien jeton (même expiré depuis < 10 min) + vidéo toujours lisible. */
  async refresh(videoId: string, previousToken: string): Promise<PlaybackRefresh> {
    const claims = await this.tokens.verify(previousToken, videoId, REFRESH_GRACE_SEC);
    if (!claims) throw ProblemException.unauthorized('Session de lecture expirée.');
    await this.playable(videoId);
    await this.enforce('refresh', claims.sessionId, QUOTAS.refreshPerSession);
    const { token, expiresAt } = await this.tokens.sign(claims);
    return { token, expiresAt: expiresAt.toISOString() };
  }

  async master(videoId: string, token: string | undefined): Promise<string> {
    await this.authorize(videoId, token);
    const video = await this.playable(videoId);
    const playlist = await this.readPlaylist(video, 'master.m3u8');
    const t = encodeURIComponent(token!);
    return rewriteMaster(
      playlist,
      (r) =>
        `${this.env.API_PUBLIC_URL}/v1/playback/${videoId}/${r}/index.m3u8?${PLAYBACK_TOKEN_PARAM}=${t}`,
    );
  }

  async variant(videoId: string, rendition: string, token: string | undefined): Promise<string> {
    await this.authorize(videoId, token);
    const video = await this.playable(videoId);
    const playlist = await this.readPlaylist(video, join(rendition, 'index.m3u8'));
    const t = encodeURIComponent(token!);
    return rewriteVariant(
      playlist,
      (segment) =>
        `${this.env.MEDIA_PUBLIC_URL}/hls/${videoId}/${rendition}/${segment}?${PLAYBACK_TOKEN_PARAM}=${t}`,
      (keyId) =>
        `${this.env.API_PUBLIC_URL}/v1/playback/keys/${keyId}?${PLAYBACK_TOKEN_PARAM}=${t}&v=${videoId}`,
    );
  }

  /** Clé AES-128 : jeton obligatoire, vidéo correspondante, quota strict. */
  async key(
    keyId: string,
    token: string | undefined,
    videoIdHint: string | undefined,
  ): Promise<Buffer> {
    const videoId = videoIdHint ?? (await this.videoIdForKey(keyId));
    const claims = await this.authorize(videoId, token);
    const video = await this.playable(videoId);
    if (video.keyId !== keyId) throw ProblemException.forbidden();
    await this.enforce('keys', claims.sessionId, QUOTAS.keysPerSession);
    const key = await this.prisma.contentKey.findFirst({ where: { id: keyId, revokedAt: null } });
    if (!key) throw ProblemException.forbidden();
    return openSecret(key.keyEnc, this.env.MEDIA_KEY_SECRET);
  }

  /** Chemin absolu d'un segment autorisé (noms validés par expression régulière : pas de traversée). */
  async segmentPath(
    videoId: string,
    rendition: string,
    segment: string,
    token: string | undefined,
  ): Promise<string> {
    const claims = await this.authorize(videoId, token);
    const video = await this.playable(videoId);
    await this.enforce('segments', claims.sessionId, QUOTAS.segmentsPerSession);
    const base = resolve(this.hlsRoot, video.hlsBasePath);
    const full = resolve(base, rendition, segment);
    if (!full.startsWith(base)) throw ProblemException.forbidden();
    return full;
  }

  private async authorize(videoId: string, token: string | undefined) {
    const claims = await this.tokens.verify(token, videoId);
    if (!claims) throw ProblemException.forbidden('Jeton de lecture invalide ou expiré.');
    return claims;
  }

  /**
   * Vidéo prête d'un film visible et déjà sorti (mis en cache 30 s ; invalidé à chaque action
   * d'administration).
   */
  private async playable(videoId: string): Promise<PlayableVideo> {
    const video = await this.cache.wrap('playback', videoId, 30, async () => {
      const row = await this.prisma.videoAsset.findFirst({
        where: { id: videoId, state: 'READY', film: playableWhere() },
        select: { id: true, hlsBasePath: true, keyId: true },
      });
      return row?.hlsBasePath
        ? { id: row.id, hlsBasePath: row.hlsBasePath, keyId: row.keyId }
        : null;
    });
    if (!video) throw ProblemException.notFound('Cette vidéo n’est pas disponible.');
    return video;
  }

  private async videoIdForKey(keyId: string): Promise<string> {
    const video = await this.prisma.videoAsset.findFirst({
      where: { keyId },
      select: { id: true },
    });
    if (!video) throw ProblemException.forbidden();
    return video.id;
  }

  private async readPlaylist(video: PlayableVideo, relative: string): Promise<string> {
    const base = resolve(this.hlsRoot, video.hlsBasePath);
    const full = resolve(base, relative);
    if (!full.startsWith(base)) throw ProblemException.forbidden();
    try {
      return await readFile(full, 'utf8');
    } catch {
      throw ProblemException.notFound();
    }
  }

  private async enforce(
    name: string,
    subject: string,
    quota: { limit: number; ttlMs: number },
  ): Promise<void> {
    const record = await this.quotas.increment(
      subject,
      quota.ttlMs,
      quota.limit,
      quota.ttlMs,
      `play-${name}`,
    );
    if (record.isBlocked) {
      this.logger.warn(
        { quota: name, subject: subject.slice(0, 6) },
        'Quota de lecture dépassé (aspiration possible)',
      );
      throw ProblemException.tooManyRequests('Trop de requêtes de lecture.');
    }
  }
}
