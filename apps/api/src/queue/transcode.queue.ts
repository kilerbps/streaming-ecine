import type { JobsOptions, Queue, RedisOptions } from 'bullmq';

/** File BullMQ du transcodage HLS (producteur : API ; consommateur : worker). */
export const TRANSCODE_QUEUE = 'transcode';
export const TRANSCODE_JOB = 'transcode';

export interface TranscodeJobData {
  videoAssetId: string;
}

/** Aperçu promotionnel d'un film (ADR-0015) : la tâche relit le film au moment de s'exécuter. */
export const PREVIEW_JOB = 'preview';

export interface PreviewJobData {
  filmId: string;
}

/** Tâches de la file `transcode`. */
export type QueueJobData = TranscodeJobData | PreviewJobData;

/** Options d'une tâche : identifiant = id de la vidéo (pas de doublon), 2 tentatives espacées. */
export function transcodeJobOptions(videoAssetId: string): JobsOptions {
  return {
    jobId: videoAssetId,
    attempts: 2,
    backoff: { type: 'exponential', delay: 60_000 },
    removeOnComplete: true,
    removeOnFail: { age: 7 * 24 * 3600 },
  };
}

/** Ajoute la tâche de transcodage d'une vidéo (ignorée par BullMQ si elle existe déjà). */
export async function enqueueTranscode(
  queue: Queue<QueueJobData>,
  videoAssetId: string,
): Promise<void> {
  await queue.add(TRANSCODE_JOB, { videoAssetId }, transcodeJobOptions(videoAssetId));
}

/** Une tâche d'aperçu en attente par film ; elle lit le début et la vidéo les plus récents. */
export function previewJobOptions(filmId: string): JobsOptions {
  return {
    jobId: `preview-${filmId}`,
    attempts: 2,
    backoff: { type: 'exponential', delay: 60_000 },
    removeOnComplete: true,
    removeOnFail: { age: 7 * 24 * 3600 },
  };
}

export async function enqueuePreview(queue: Queue<QueueJobData>, filmId: string): Promise<void> {
  await queue.add(PREVIEW_JOB, { filmId }, previewJobOptions(filmId));
}

/**
 * Options de connexion ioredis tirées de REDIS_URL (`redis://[:mot-de-passe@]hôte:port[/base]`, `rediss://` = TLS).
 * `maxRetriesPerRequest: null` est exigé par BullMQ pour les connexions bloquantes des workers.
 */
export function redisConnectionOptions(url: string): RedisOptions {
  const parsed = new URL(url);
  if (parsed.protocol !== 'redis:' && parsed.protocol !== 'rediss:') {
    throw new Error('REDIS_URL doit commencer par redis:// ou rediss://');
  }
  const db = parsed.pathname.replace(/^\//, '');
  return {
    host: parsed.hostname || 'localhost',
    port: parsed.port ? Number(parsed.port) : 6379,
    ...(parsed.username ? { username: decodeURIComponent(parsed.username) } : {}),
    ...(parsed.password ? { password: decodeURIComponent(parsed.password) } : {}),
    ...(db ? { db: Number(db) } : {}),
    ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
    maxRetriesPerRequest: null,
  };
}
