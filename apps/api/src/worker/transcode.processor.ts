import type { ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Inject, Logger, type OnApplicationShutdown } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { type Job, UnrecoverableError } from 'bullmq';
import { ENV, type Env } from '../config/env.js';
import { sealSecret } from '../common/crypto.js';
import { hlsDir, randomAlnum, storageFile } from '../media/storage.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  PREVIEW_JOB,
  TRANSCODE_QUEUE,
  type PreviewJobData,
  type QueueJobData,
  type TranscodeJobData,
} from '../queue/transcode.queue.js';
import { ContentEventsService } from '../revalidate/content-events.service.js';
import {
  buildHlsArgs,
  InvalidSourceError,
  keyInfoContent,
  parseProgress,
  pickLadder,
} from './ffmpeg.js';
import { BinaryMissingError, probe, ProbeFailedError, runProcess } from './ffmpeg-runner.js';
import { PreviewGenerator } from './preview.generator.js';

/** Écriture de la progression en base au plus toutes les 3 s. */
const PROGRESS_WRITE_MS = 3000;
/** FFmpeg arrêté s'il ne signale plus aucune progression pendant 10 min. */
const IDLE_TIMEOUT_MS = 10 * 60_000;

/** Échec expliqué à l'éditeur (message court en français, sans chemin ni trace technique). */
class TranscodeError extends Error {
  constructor(
    readonly userMessage: string,
    readonly retryable: boolean,
  ) {
    super(userMessage);
    this.name = 'TranscodeError';
  }
}

function toTranscodeError(err: unknown): TranscodeError {
  if (err instanceof TranscodeError) return err;
  if (err instanceof BinaryMissingError) {
    return new TranscodeError(
      'FFmpeg est introuvable sur le serveur de traitement : installez-le ou renseignez FFMPEG_PATH et FFPROBE_PATH.',
      false,
    );
  }
  if (err instanceof InvalidSourceError || err instanceof ProbeFailedError) {
    return new TranscodeError(
      'Le fichier source est illisible ou ne contient pas de piste vidéo exploitable.',
      false,
    );
  }
  return new TranscodeError('Erreur inattendue pendant le transcodage. Réessayez plus tard.', true);
}

/**
 * Transcodage HLS chiffré (docs/02-ARCHITECTURE.md §8) : sonde, clé AES-128 scellée en base,
 * FFmpeg (échelle 144p → 1080p selon la source), puis vidéo READY et revalidation du site.
 * La clé en clair n'existe que dans un dossier temporaire privé, supprimé dans tous les cas.
 */
@Processor(TRANSCODE_QUEUE, { concurrency: 1 })
export class TranscodeProcessor extends WorkerHost implements OnApplicationShutdown {
  private readonly logger = new Logger(TranscodeProcessor.name);
  private running: ChildProcess | null = null;
  private lastWorkerError = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: ContentEventsService,
    private readonly previews: PreviewGenerator,
    @Inject(ENV) private readonly env: Env,
  ) {
    super();
  }

  async process(job: Job<QueueJobData>): Promise<void> {
    // Aperçu promotionnel demandé depuis l'administration (ADR-0015).
    if (job.name === PREVIEW_JOB) {
      await this.previews.generate((job.data as PreviewJobData).filmId);
      return;
    }
    const { videoAssetId } = job.data as TranscodeJobData;
    const video = await this.prisma.videoAsset.findUnique({
      where: { id: videoAssetId },
      include: {
        sourceMedia: { select: { storageKey: true } },
        film: { select: { id: true, slug: true, runtimeSec: true } },
      },
    });
    if (!video) {
      this.logger.warn({ videoAssetId }, 'Vidéo supprimée avant transcodage : tâche ignorée');
      return;
    }
    if (video.state === 'READY') return;

    await this.prisma.videoAsset.update({
      where: { id: video.id },
      data: { state: 'PROCESSING', progress: 0, error: null },
    });
    const outDir = hlsDir(this.env, video.id);
    const keyDir = await mkdtemp(join(tmpdir(), 'ecine-key-'));
    let orphanKeyId: string | null = null;
    const started = Date.now();

    try {
      const input = storageFile(this.env, video.sourceMedia.storageKey);
      await access(input).catch(() => {
        throw new TranscodeError('Le fichier source est introuvable sur le serveur.', false);
      });
      const info = await probe(this.env.FFPROBE_PATH, input);
      const ladder = pickLadder(info.height);

      // Clé AES-128 + IV : scellée en base (MEDIA_KEY_SECRET), en clair seulement le temps du transcodage.
      const key = randomBytes(16);
      const iv = randomBytes(16);
      const contentKey = await this.prisma.contentKey.create({
        data: { keyEnc: sealSecret(key, this.env.MEDIA_KEY_SECRET) },
      });
      orphanKeyId = contentKey.id;
      const keyPath = join(keyDir, 'key.bin');
      const keyInfoPath = join(keyDir, 'keyinfo');
      await writeFile(keyPath, key, { mode: 0o600 });
      await writeFile(keyInfoPath, keyInfoContent(contentKey.id, keyPath, iv.toString('hex')), {
        mode: 0o600,
      });

      await rm(outDir, { recursive: true, force: true });
      for (const height of ladder) await mkdir(join(outDir, `${height}p`), { recursive: true });

      const args = buildHlsArgs({
        input,
        outDir,
        ladder,
        keyInfoPath,
        segmentPrefix: randomAlnum(12),
        hasAudio: info.hasAudio,
        fps: info.fps,
      });
      let lastPercent = 0;
      let lastWrite = Date.now();
      let pendingWrite: Promise<unknown> = Promise.resolve();
      const result = await runProcess(this.env.FFMPEG_PATH, args, {
        idleTimeoutMs: IDLE_TIMEOUT_MS,
        onSpawn: (child) => {
          this.running = child;
        },
        onStdoutLine: (line) => {
          const percent = parseProgress(line, info.durationSec);
          if (percent === null || percent <= lastPercent || percent >= 100) return;
          lastPercent = percent;
          if (Date.now() - lastWrite < PROGRESS_WRITE_MS) return;
          lastWrite = Date.now();
          pendingWrite = pendingWrite
            .then(() =>
              this.prisma.videoAsset.updateMany({
                where: { id: video.id, state: 'PROCESSING' },
                data: { progress: percent },
              }),
            )
            .catch((err: Error) =>
              this.logger.warn(`Progression non enregistrée : ${err.message}`),
            );
        },
      });
      this.running = null;
      await pendingWrite;

      if (result.idleKilled)
        throw new TranscodeError('Le transcodage ne progressait plus et a été interrompu.', true);
      if (result.code !== 0) {
        this.logger.error(
          { videoAssetId, code: result.code, signal: result.signal, ffmpeg: result.stderrTail },
          'FFmpeg a échoué',
        );
        throw new TranscodeError(
          'Le transcodage a échoué. Vérifiez le fichier source ou réessayez.',
          true,
        );
      }
      await access(join(outDir, 'master.m3u8')).catch(() => {
        throw new TranscodeError('La sortie du transcodage est incomplète.', true);
      });

      const durationSec = Math.max(1, Math.round(info.durationSec));
      await this.prisma.$transaction([
        this.prisma.videoAsset.update({
          where: { id: video.id },
          data: {
            state: 'READY',
            progress: 100,
            durationSec,
            renditions: ladder,
            hlsBasePath: video.id,
            keyId: contentKey.id,
            error: null,
          },
        }),
        ...(video.film.runtimeSec === null
          ? [
              this.prisma.film.update({
                where: { id: video.film.id },
                data: { runtimeSec: durationSec },
              }),
            ]
          : []),
      ]);
      orphanKeyId = null;
      this.logger.log(
        {
          videoAssetId,
          renditions: ladder,
          durationSec,
          seconds: Math.round((Date.now() - started) / 1000),
        },
        'Vidéo prête (HLS chiffré)',
      );
      // Nouvelle vidéo prête : l'aperçu promotionnel est retaillé dans la nouvelle source.
      await this.previews
        .generate(video.film.id)
        .catch((err: unknown) =>
          this.logger.warn(
            { filmId: video.film.id, err: (err as Error).message },
            'Aperçu promotionnel non généré',
          ),
        );
    } catch (err) {
      const failure = toTranscodeError(err);
      if (!(err instanceof TranscodeError))
        this.logger.error({ videoAssetId, err: (err as Error).message }, 'Transcodage interrompu');
      await this.recordFailure(job, video.id, outDir, orphanKeyId, failure);
      await this.events.changed('video', [video.film.slug]);
      throw failure.retryable ? failure : new UnrecoverableError(failure.userMessage);
    } finally {
      this.running = null;
      // Clé en clair et fichier keyinfo : supprimés quoi qu'il arrive.
      await rm(keyDir, { recursive: true, force: true });
    }
    await this.events.changed('video', [video.film.slug]);
  }

  /** Arrêt du worker : FFmpeg ne doit pas survivre au processus (la tâche sera reprise). */
  onApplicationShutdown(): void {
    this.running?.kill('SIGKILL');
  }

  /** Redis injoignable : un avertissement par minute au plus (BullMQ se reconnecte seul). */
  @OnWorkerEvent('error')
  onWorkerError(err: Error): void {
    if (Date.now() - this.lastWorkerError < 60_000) return;
    this.lastWorkerError = Date.now();
    this.logger.warn(`File de transcodage indisponible : ${err.message}`);
  }

  private async recordFailure(
    job: Job<QueueJobData>,
    videoId: string,
    outDir: string,
    orphanKeyId: string | null,
    failure: TranscodeError,
  ): Promise<void> {
    await rm(outDir, { recursive: true, force: true }).catch(() => undefined);
    if (orphanKeyId)
      await this.prisma.contentKey.delete({ where: { id: orphanKeyId } }).catch(() => undefined);
    const willRetry = failure.retryable && job.attemptsMade + 1 < (job.opts.attempts ?? 1);
    await this.prisma.videoAsset.updateMany({
      where: { id: videoId },
      data: willRetry
        ? {
            state: 'PENDING',
            progress: null,
            error: `${failure.userMessage} Nouvel essai automatique dans quelques minutes.`,
          }
        : { state: 'FAILED', progress: null, error: failure.userMessage },
    });
  }
}
