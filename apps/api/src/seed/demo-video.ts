import 'reflect-metadata';
import 'dotenv/config';
import { rm, stat } from 'node:fs/promises';
import { Logger } from '@nestjs/common';
import { slugSchema } from '@ecine/contracts';
import { Queue } from 'bullmq';
import { loadEnv } from '../config/env.js';
import { newId, storageFile } from '../media/storage.js';
import { registerVideoSource } from '../media/video-source.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  enqueueTranscode,
  redisConnectionOptions,
  TRANSCODE_QUEUE,
  type TranscodeJobData,
} from '../queue/transcode.queue.js';
import { buildTestSourceArgs } from '../worker/ffmpeg.js';
import { BinaryMissingError, runProcess } from '../worker/ffmpeg-runner.js';

/**
 * Vidéo de démonstration (dist/seed/demo-video.js <slug-du-film>) : mire de 40 s générée par FFmpeg,
 * enregistrée comme source privée puis mise en file de transcodage. À lancer dans le conteneur worker
 * (FFmpeg requis), avec le même STORAGE_DIR que le worker. Interdit en production.
 */

const logger = new Logger('DemoVideo');

async function main(): Promise<void> {
  const env = loadEnv();
  if (env.NODE_ENV === 'production') {
    throw new Error(
      'Vidéo de démonstration interdite en production (lancez avec NODE_ENV=development sur un environnement de test).',
    );
  }
  const slug = slugSchema.safeParse(process.argv[2]);
  if (!slug.success) throw new Error('Usage : node dist/seed/demo-video.js <slug-du-film>');

  const prisma = new PrismaService(env);
  const queue = new Queue<TranscodeJobData>(TRANSCODE_QUEUE, {
    connection: redisConnectionOptions(env.REDIS_URL),
    prefix: 'bull',
  });
  try {
    const film = await prisma.film.findFirst({
      where: { slug: slug.data, deletedAt: null },
      select: { id: true },
    });
    if (!film) throw new Error(`Film introuvable : ${slug.data}`);

    const mediaId = newId();
    const storageKey = `sources/${mediaId}.mp4`;
    const output = storageFile(env, storageKey);
    logger.log('Génération de la mire de test (40 s)…');
    const result = await runProcess(env.FFMPEG_PATH, buildTestSourceArgs(output, 40), {
      idleTimeoutMs: 5 * 60_000,
    }).catch((err: unknown) => {
      if (err instanceof BinaryMissingError)
        throw new Error(
          'FFmpeg est introuvable : lancez ce script dans le conteneur worker ou renseignez FFMPEG_PATH.',
        );
      throw err;
    });
    if (result.code !== 0) {
      await rm(output, { force: true });
      throw new Error(
        `FFmpeg a échoué (code ${result.code ?? result.signal ?? '?'}) : ${result.stderrTail.slice(-500)}`,
      );
    }

    const { size } = await stat(output);
    const video = await registerVideoSource(prisma, {
      filmId: film.id,
      mediaId,
      storageKey,
      mime: 'video/mp4',
      bytes: size,
    });
    await enqueueTranscode(queue, video.id);
    logger.log(
      `Vidéo ${video.id} en file de transcodage (suivi : GET /v1/admin/videos/${video.id}/status).`,
    );
  } finally {
    await queue.close();
    await prisma.$disconnect();
  }
}

try {
  await main();
} catch (err) {
  logger.error(`Échec : ${(err as Error).message}`);
  process.exitCode = 1;
}
