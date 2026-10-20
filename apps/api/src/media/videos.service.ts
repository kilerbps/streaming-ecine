import { rm } from 'node:fs/promises';
import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import type { Request } from 'express';
import type { VideoStatus } from '@ecine/contracts';
import { ENV, type Env } from '../config/env.js';
import { AuditService } from '../audit/audit.service.js';
import { ProblemException } from '../common/problem.js';
import type { VideoAsset } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  enqueuePreview,
  enqueueTranscode,
  TRANSCODE_QUEUE,
  type QueueJobData,
} from '../queue/transcode.queue.js';
import { ContentEventsService } from '../revalidate/content-events.service.js';
import { hlsDir, storageFile } from './storage.js';

/** Délai maximal d'attente de Redis lors de l'ajout d'une tâche (la requête HTTP ne reste pas bloquée). */
const ENQUEUE_TIMEOUT_MS = 5000;
const QUEUE_DOWN_MESSAGE =
  'File de traitement momentanément indisponible : relancez le transcodage dans quelques minutes.';

export function videoStatus(
  video: Pick<VideoAsset, 'id' | 'state' | 'progress' | 'error'>,
): VideoStatus {
  return {
    id: video.id,
    state: video.state,
    progress: video.state === 'READY' ? 100 : video.progress,
    error: video.state === 'READY' ? null : video.error,
  };
}

/** Suivi, relance et suppression des vidéos transcodées (sources et HLS privés). */
@Injectable()
export class VideosService implements OnModuleInit {
  private readonly logger = new Logger(VideosService.name);
  private lastQueueError = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: ContentEventsService,
    @InjectQueue(TRANSCODE_QUEUE) private readonly queue: Queue<QueueJobData>,
    @Inject(ENV) private readonly env: Env,
  ) {}

  onModuleInit(): void {
    // Redis absent : un avertissement par minute au plus (l'API reste disponible).
    this.queue.on('error', (err: Error) => {
      if (Date.now() - this.lastQueueError < 60_000) return;
      this.lastQueueError = Date.now();
      this.logger.warn(`File de transcodage indisponible : ${err.message}`);
    });
  }

  async status(id: string): Promise<VideoStatus> {
    const video = await this.prisma.videoAsset.findUnique({
      where: { id },
      select: { id: true, state: true, progress: true, error: true },
    });
    if (!video) throw ProblemException.notFound('Vidéo introuvable.');
    return videoStatus(video);
  }

  /**
   * Ajoute la tâche de transcodage. Si Redis ne répond pas, la vidéo reste PENDING avec un message
   * et pourra être relancée (aucune perte : la source est déjà enregistrée).
   */
  async enqueue(videoAssetId: string): Promise<boolean> {
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        enqueueTranscode(this.queue, videoAssetId),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('délai dépassé')), ENQUEUE_TIMEOUT_MS);
        }),
      ]);
      return true;
    } catch (err) {
      this.logger.warn(
        { videoAssetId },
        `Tâche de transcodage non ajoutée : ${(err as Error).message}`,
      );
      await this.prisma.videoAsset.updateMany({
        where: { id: videoAssetId, state: 'PENDING' },
        data: { error: QUEUE_DOWN_MESSAGE },
      });
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Demande (ou retire) l'aperçu promotionnel d'un film (ADR-0015) : le worker relit le début
   * choisi et la vidéo prête la plus récente. Sans Redis, rien n'est perdu : la prochaine
   * modification du film ou le prochain transcodage relancera la tâche.
   */
  async requestPreview(filmId: string): Promise<boolean> {
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        enqueuePreview(this.queue, filmId),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('délai dépassé')), ENQUEUE_TIMEOUT_MS);
        }),
      ]);
      return true;
    } catch (err) {
      this.logger.warn({ filmId }, `Tâche d'aperçu non ajoutée : ${(err as Error).message}`);
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Relance d'une vidéo en échec (ou en attente sans tâche, après une panne de Redis). */
  async retry(id: string, req: Request): Promise<VideoStatus> {
    const video = await this.prisma.videoAsset.findUnique({
      where: { id },
      include: { film: { select: { slug: true } } },
    });
    if (!video) throw ProblemException.notFound('Vidéo introuvable.');
    const jobState = await this.jobState(id);
    const retryable =
      video.state === 'FAILED' ||
      (video.state === 'PENDING' && (jobState === 'unknown' || jobState === 'failed'));
    if (!retryable)
      throw ProblemException.conflict('Cette vidéo est déjà prête ou en cours de traitement.');

    // L'ancienne tâche en échec garde son identifiant : on la retire avant d'en ajouter une nouvelle.
    if (jobState === 'failed') await this.queue.remove(id).catch(() => 0);
    const updated = await this.prisma.videoAsset.update({
      where: { id },
      data: { state: 'PENDING', progress: null, error: null },
    });
    const queued = await this.enqueue(id);
    await this.audit.log(req, {
      action: 'video.retry',
      entity: 'VideoAsset',
      entityId: id,
      meta: { queued },
    });
    await this.events.changed('video', [video.film.slug]);
    return queued ? videoStatus(updated) : this.status(id);
  }

  /** Suppression définitive : tâche, fichiers HLS, source privée, lignes ; la clé AES est révoquée. */
  async remove(id: string, req: Request): Promise<void> {
    const video = await this.prisma.videoAsset.findUnique({
      where: { id },
      include: {
        film: { select: { slug: true } },
        sourceMedia: { select: { id: true, storageKey: true } },
      },
    });
    if (!video) throw ProblemException.notFound('Vidéo introuvable.');
    const jobState = await this.jobState(id);
    if (jobState === 'active') {
      throw ProblemException.conflict(
        'Transcodage en cours : attendez sa fin (ou son échec) avant de supprimer cette vidéo.',
      );
    }
    if (jobState !== 'unknown') await this.queue.remove(id).catch(() => 0);

    const otherUses = await this.prisma.videoAsset.count({
      where: { sourceMediaId: video.sourceMediaId, id: { not: id } },
    });
    await this.prisma.$transaction([
      this.prisma.videoAsset.delete({ where: { id } }),
      ...(otherUses === 0
        ? [this.prisma.media.delete({ where: { id: video.sourceMedia.id } })]
        : []),
      ...(video.keyId
        ? [
            this.prisma.contentKey.update({
              where: { id: video.keyId },
              data: { revokedAt: new Date() },
            }),
          ]
        : []),
    ]);

    await rm(hlsDir(this.env, video.hlsBasePath ?? video.id), { recursive: true, force: true });
    if (otherUses === 0)
      await rm(storageFile(this.env, video.sourceMedia.storageKey), { force: true });
    await this.audit.log(req, {
      action: 'video.delete',
      entity: 'VideoAsset',
      entityId: id,
      meta: { filmId: video.filmId, state: video.state, keyRevoked: Boolean(video.keyId) },
    });
    await this.events.changed('video', [video.film.slug]);
  }

  private async jobState(id: string): Promise<string> {
    try {
      return await Promise.race([
        this.queue.getJobState(id),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('délai dépassé')), ENQUEUE_TIMEOUT_MS).unref(),
        ),
      ]);
    } catch {
      throw new ProblemException({
        type: 'about:blank',
        title: 'Service indisponible',
        status: 503,
        detail: QUEUE_DOWN_MESSAGE,
      });
    }
  }
}
