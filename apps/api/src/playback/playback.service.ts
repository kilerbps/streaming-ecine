import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { PlaybackRefresh, PlaybackSession } from '@ecine/contracts';
import { ENV, type Env } from '../config/env.js';
import { hmacHex, openSecret, randomToken } from '../common/crypto.js';
import { kinshasaDay } from '../common/kinshasa.js';
import { ProblemException } from '../common/problem.js';
import { playableWhere } from '../content/content.helpers.js';
import { storagePaths } from '../media/static.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CacheService } from '../redis/cache.service.js';
import {
  capMaster,
  mediaHrefs,
  renditionHeight,
  rewriteMaster,
  rewriteVariant,
} from './hls-rewrite.js';
import { RateLimitService, type Identity } from '../rate-limit/rate-limit.service.js';
import { PlaybackTokenService, type PlaybackClaims } from './playback-token.service.js';

/** Visiteur d'une session : identité de limite (ADR-0015) et données du comptage du Top 10. */
export interface PlaybackViewer {
  identity: Identity;
  ip: string | undefined;
  userAgent: string | undefined;
  userId: string | null;
  deviceId: string | null;
}

// Quotas : apps/src/rate-limit/policies.ts (ADR-0015). Une lecture normale charge ~10 segments/min.
const REFRESH_GRACE_SEC = 10 * 60;
/** Aperçus automatiques : toujours muets, en 240p au plus (docs/design/03, mode allégé). */
const PREVIEW_MAX_HEIGHT = 240;

interface PlayableVideo {
  id: string;
  filmId: string;
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
    private readonly limits: RateLimitService,
    private readonly tokens: PlaybackTokenService,
    @Inject(ENV) private readonly env: Env,
  ) {
    this.hlsRoot = storagePaths(env).hls;
  }

  /**
   * Nouvelle session de lecture, sous les limites par identité (ADR-0015). Une vraie lecture (pas un
   * aperçu) est comptée pour le Top 10 : une ligne par jour, film et spectateur, le spectateur
   * n'étant connu que par une empreinte HMAC propre au jour (ADR-0014).
   */
  async createSession(
    videoId: string,
    viewer: PlaybackViewer,
    preview = false,
  ): Promise<PlaybackSession> {
    const video = await this.playable(videoId);
    await this.limits.sessionOpen(viewer.identity, preview);
    if (!preview) await this.recordView(video.filmId, viewer);
    const sessionId = randomToken(12);
    const { token, expiresAt } = await this.tokens.sign({
      videoId,
      sessionId,
      preview,
      identityKey: viewer.identity.key,
    });
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
    await this.limits.sessionQuota('refresh', claims.sessionId);
    const { token, expiresAt } = await this.tokens.sign(claims);
    // Le renouvellement sert de signal de présence (sessions simultanées) : une session ouverte
    // puis abandonnée (zapping, rechargement) ne compte jamais ; une lecture de plus de ~4 min, si.
    if (!claims.preview && claims.identityKey) {
      await this.limits.trackSession(claims.identityKey, claims.sessionId, expiresAt);
    }
    return { token, expiresAt: expiresAt.toISOString() };
  }

  private hrefs(videoId: string, token: string, bare: boolean) {
    return mediaHrefs({
      api: this.env.API_PUBLIC_URL,
      media: this.env.MEDIA_PUBLIC_URL,
      videoId,
      token,
      bare,
    });
  }

  /** `bare` : adresses sans jeton (hls.js l'ajoute à chaque requête, la clé garde son adresse). */
  async master(videoId: string, token: string | undefined, bare = false): Promise<string> {
    const claims = await this.authorize(videoId, token);
    const video = await this.playable(videoId);
    const full = await this.readPlaylist(video, 'master.m3u8');
    const playlist = claims.preview ? capMaster(full, PREVIEW_MAX_HEIGHT) : full;
    return rewriteMaster(playlist, this.hrefs(videoId, token!, bare).variant);
  }

  async variant(
    videoId: string,
    rendition: string,
    token: string | undefined,
    bare = false,
  ): Promise<string> {
    const claims = await this.authorize(videoId, token);
    this.assertRendition(claims, rendition);
    const video = await this.playable(videoId);
    const playlist = await this.readPlaylist(video, join(rendition, 'index.m3u8'));
    const hrefs = this.hrefs(videoId, token!, bare);
    return rewriteVariant(playlist, (segment) => hrefs.segment(rendition, segment), hrefs.key);
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
    await this.limits.sessionQuota('keys', claims.sessionId, claims.identityKey);
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
    this.assertRendition(claims, rendition);
    const video = await this.playable(videoId);
    await this.limits.sessionQuota('segments', claims.sessionId);
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

  /** Un jeton d'aperçu n'ouvre que les rendus de 240p au plus (l'échelle commence toujours à 144p). */
  private assertRendition(claims: PlaybackClaims, rendition: string): void {
    if (claims.preview && renditionHeight(rendition) > PREVIEW_MAX_HEIGHT) {
      throw ProblemException.forbidden('Rendu non autorisé pour un aperçu.');
    }
  }

  /** Lecture du jour pour le Top 10 ; jamais bloquante pour la lecture elle-même. */
  private async recordView(filmId: string, viewer: PlaybackViewer): Promise<void> {
    const day = kinshasaDay(new Date());
    // Membre, sinon appareil (ADR-0015) ; sans appareil, IP et agent (sous-compte derrière un CGNAT).
    const who = viewer.userId
      ? `u:${viewer.userId}`
      : viewer.deviceId
        ? `d:${viewer.deviceId}`
        : `v:${viewer.ip ?? ''}|${viewer.userAgent ?? ''}`;
    const viewerHash = hmacHex(this.env.IP_HASH_SALT, `top10:${day}:${who}`);
    try {
      await this.prisma.playbackView.createMany({
        data: [{ day: new Date(`${day}T00:00:00Z`), filmId, viewerHash }],
        skipDuplicates: true,
      });
    } catch (err) {
      this.logger.warn(`Lecture non comptée : ${(err as Error).message}`);
    }
  }

  /**
   * Vidéo prête d'un film visible et déjà sorti (mis en cache 30 s ; invalidé à chaque action
   * d'administration).
   */
  private async playable(videoId: string): Promise<PlayableVideo> {
    const video = await this.cache.wrap('playback', `video:${videoId}`, 30, async () => {
      const row = await this.prisma.videoAsset.findFirst({
        where: { id: videoId, state: 'READY', film: playableWhere() },
        select: { id: true, filmId: true, hlsBasePath: true, keyId: true },
      });
      return row?.hlsBasePath
        ? { id: row.id, filmId: row.filmId, hlsBasePath: row.hlsBasePath, keyId: row.keyId }
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
}
