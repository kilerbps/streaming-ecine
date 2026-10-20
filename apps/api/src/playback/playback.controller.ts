import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  idSchema,
  PLAYBACK_TOKEN_PARAM,
  playbackRefreshSchema,
  playbackSessionQuerySchema,
  playbackSessionSchema,
  type PlaybackRefresh,
  type PlaybackSession,
} from '@ecine/contracts';
import { z } from 'zod';
import { Returns } from '../common/contract.decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { Public } from '../auth/decorators.js';
import { RateLimitService } from '../rate-limit/rate-limit.service.js';
import { RENDITION_RE, SEGMENT_RE } from './hls-rewrite.js';
import { PlaybackService } from './playback.service.js';

const tokenQuery = z.object({
  [PLAYBACK_TOKEN_PARAM]: z.string().max(1024).optional(),
  v: idSchema.optional(),
});
const refreshBody = z.strictObject({ token: z.string().min(10).max(1024) });
const renditionParam = z.string().regex(RENDITION_RE);
const segmentParam = z.string().regex(SEGMENT_RE);

const HLS_TYPE = 'application/vnd.apple.mpegurl';

function noStore(res: Response): void {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
}

/** Lecture vidéo sécurisée (docs/02-ARCHITECTURE.md §8, docs/06-SECURITY.md §6). */
@ApiTags('playback')
@Public()
@Controller('playback')
export class PlaybackController {
  constructor(
    private readonly playback: PlaybackService,
    private readonly limits: RateLimitService,
  ) {}

  // Limites : par identité, pot commun et plafond de l'IP (RateLimitService.sessionOpen, ADR-0015).
  @Post(':videoId/session')
  @Returns(playbackSessionSchema)
  session(
    @Param('videoId', new ZodPipe(idSchema)) videoId: string,
    @Query(new ZodPipe(playbackSessionQuerySchema)) q: z.infer<typeof playbackSessionQuerySchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PlaybackSession> {
    noStore(res);
    return this.playback.createSession(
      videoId,
      {
        identity: this.limits.identify(req),
        ip: req.clientIp,
        userAgent: req.clientUserAgent,
        userId: req.user?.id ?? null,
        deviceId: req.device?.id ?? null,
      },
      q.apercu === '1',
    );
  }

  @Post(':videoId/refresh')
  @HttpCode(200)
  @Returns(playbackRefreshSchema)
  refresh(
    @Param('videoId', new ZodPipe(idSchema)) videoId: string,
    @Body(new ZodPipe(refreshBody)) body: z.infer<typeof refreshBody>,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PlaybackRefresh> {
    noStore(res);
    return this.playback.refresh(videoId, body.token);
  }

  @Get('keys/:keyId')
  @SkipThrottle()
  async key(
    @Param('keyId', new ZodPipe(z.string().regex(/^[a-z0-9]{10,40}$/))) keyId: string,
    @Query(new ZodPipe(tokenQuery)) q: z.infer<typeof tokenQuery>,
    @Res() res: Response,
  ): Promise<void> {
    const key = await this.playback.key(keyId, q[PLAYBACK_TOKEN_PARAM], q.v);
    noStore(res);
    res.type('application/octet-stream').send(key);
  }

  @Get(':videoId/master.m3u8')
  @SkipThrottle()
  async master(
    @Param('videoId', new ZodPipe(idSchema)) videoId: string,
    @Query(new ZodPipe(tokenQuery)) q: z.infer<typeof tokenQuery>,
    @Res() res: Response,
  ): Promise<void> {
    const playlist = await this.playback.master(videoId, q[PLAYBACK_TOKEN_PARAM]);
    noStore(res);
    res.type(HLS_TYPE).send(playlist);
  }

  @Get(':videoId/:rendition/index.m3u8')
  @SkipThrottle()
  async variant(
    @Param('videoId', new ZodPipe(idSchema)) videoId: string,
    @Param('rendition', new ZodPipe(renditionParam)) rendition: string,
    @Query(new ZodPipe(tokenQuery)) q: z.infer<typeof tokenQuery>,
    @Res() res: Response,
  ): Promise<void> {
    const playlist = await this.playback.variant(videoId, rendition, q[PLAYBACK_TOKEN_PARAM]);
    noStore(res);
    res.type(HLS_TYPE).send(playlist);
  }
}

/**
 * Segments HLS chiffrés, servis uniquement avec un jeton valide (hors préfixe /v1).
 * En production, un CDN à authentification par jeton pourra prendre le relais (ADR à venir, phase 2).
 */
@ApiTags('playback')
@Public()
@SkipThrottle()
@Controller('media/hls')
export class SegmentsController {
  constructor(private readonly playback: PlaybackService) {}

  @Get(':videoId/:rendition/:segment')
  async segment(
    @Param('videoId', new ZodPipe(idSchema)) videoId: string,
    @Param('rendition', new ZodPipe(renditionParam)) rendition: string,
    @Param('segment', new ZodPipe(segmentParam)) segment: string,
    @Query(new ZodPipe(tokenQuery)) q: z.infer<typeof tokenQuery>,
    @Res() res: Response,
  ): Promise<void> {
    const path = await this.playback.segmentPath(
      videoId,
      rendition,
      segment,
      q[PLAYBACK_TOKEN_PARAM],
    );
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.type('video/mp2t').sendFile(path, { dotfiles: 'deny' }, (err) => {
      if (err && !res.headersSent) res.status(404).end();
    });
  }
}
