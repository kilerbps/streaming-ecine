import 'reflect-metadata';
import 'dotenv/config';
import { rm, stat } from 'node:fs/promises';
import { Logger } from '@nestjs/common';
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
import { parseDemoVideoArgs } from './demo-video-args.js';
import { BinaryMissingError, runProcess } from '../worker/ffmpeg-runner.js';

/**
 * Vidéo de démonstration : mire générée par FFmpeg, enregistrée comme source privée puis mise en file
 * de transcodage. À lancer dans le conteneur worker (FFmpeg requis), avec le même STORAGE_DIR que le
 * worker. Interdit en production.
 *
 *   node dist/seed/demo-video.js <slug-du-film> [--seconds 40]
 *   node dist/seed/demo-video.js --all [--seconds 40]   (tous les films publiés)
 *
 * La page d'un film lit sa vidéo prête la plus récente : relancer le script remplace donc la vidéo
 * (utile après un changement de l'échelle de transcodage).
 */

const logger = new Logger('DemoVideo');
async function main(): Promise<void> {
  const env = loadEnv();
  if (env.NODE_ENV === 'production') {
    throw new Error(
      'Vidéo de démonstration interdite en production (lancez avec NODE_ENV=development sur un environnement de test).',
    );
  }
  const args = parseDemoVideoArgs(process.argv.slice(2));

  const prisma = new PrismaService(env);
  const queue = new Queue<TranscodeJobData>(TRANSCODE_QUEUE, {
    connection: redisConnectionOptions(env.REDIS_URL),
    prefix: 'bull',
  });
  try {
    const films = args.all
      ? await prisma.film.findMany({
          where: { state: 'PUBLISHED', deletedAt: null },
          select: { id: true, slug: true },
          orderBy: { slug: 'asc' },
        })
      : await prisma.film.findMany({
          where: { slug: args.slug!, deletedAt: null },
          select: { id: true, slug: true },
        });
    if (films.length === 0) throw new Error(`Film introuvable : ${args.slug ?? '(aucun publié)'}`);

    for (const film of films) {
      const mediaId = newId();
      const storageKey = `sources/${mediaId}.mp4`;
      const output = storageFile(env, storageKey);
      logger.log(`${film.slug} : génération de la mire de test (${args.seconds} s)…`);
      const result = await runProcess(env.FFMPEG_PATH, buildTestSourceArgs(output, args.seconds), {
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
        `${film.slug} : vidéo ${video.id} en file de transcodage (suivi : GET /v1/admin/videos/${video.id}/status).`,
      );
    }
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
