import { Inject, Injectable } from '@nestjs/common';
import { jwtVerify, SignJWT } from 'jose';
import { PLAYBACK_TOKEN_TTL_SEC } from '@ecine/contracts';
import { z } from 'zod';
import { ENV, type Env } from '../config/env.js';

const claimsSchema = z.object({
  vid: z.string(),
  psid: z.string(),
  typ: z.literal('play'),
  /** Aperçu automatique : rendus de 240p au plus, jamais compté comme lecture. */
  pv: z.literal(true).optional(),
  /** Identité de limite (clé opaque, ADR-0015) : quotas par identité et sessions simultanées. */
  idk: z.string().max(40).optional(),
});
export type PlaybackClaims = {
  videoId: string;
  sessionId: string;
  preview?: boolean;
  identityKey?: string;
};

/** Jeton de lecture signé (HS256), lié à une vidéo et à une session de lecture, durée ≤ 5 min. */
@Injectable()
export class PlaybackTokenService {
  private readonly key: Uint8Array;

  constructor(@Inject(ENV) env: Env) {
    this.key = new TextEncoder().encode(env.PLAYBACK_TOKEN_SECRET);
  }

  async sign(claims: PlaybackClaims): Promise<{ token: string; expiresAt: Date }> {
    const expiresAt = new Date(Date.now() + PLAYBACK_TOKEN_TTL_SEC * 1000);
    const token = await new SignJWT({
      vid: claims.videoId,
      psid: claims.sessionId,
      typ: 'play',
      ...(claims.preview ? { pv: true } : {}),
      ...(claims.identityKey ? { idk: claims.identityKey } : {}),
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
      .sign(this.key);
    return { token, expiresAt };
  }

  /** @param graceSec tolérance après expiration (renouvellement uniquement). */
  async verify(
    token: string | undefined,
    videoId: string,
    graceSec = 0,
  ): Promise<PlaybackClaims | null> {
    if (!token || token.length > 1024) return null;
    try {
      const { payload } = await jwtVerify(token, this.key, {
        algorithms: ['HS256'],
        clockTolerance: graceSec,
      });
      const claims = claimsSchema.parse(payload);
      if (claims.vid !== videoId) return null;
      return {
        videoId: claims.vid,
        sessionId: claims.psid,
        preview: claims.pv === true,
        identityKey: claims.idk,
      };
    } catch {
      return null;
    }
  }
}
