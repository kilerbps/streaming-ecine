import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { WorkerModule } from './worker/worker.module.js';

/**
 * Worker de transcodage (dist/worker.js) : aucun port ouvert, consomme la file BullMQ `transcode`.
 * Nécessite FFmpeg/ffprobe (image Docker cible `worker`) et un accès au même STORAGE_DIR que l'API.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  app.get(Logger).log('Worker de transcodage démarré');
}

await bootstrap();
