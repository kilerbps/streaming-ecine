import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ENV, type Env } from '../config/env.js';
import { redisConnectionOptions, TRANSCODE_QUEUE } from './transcode.queue.js';

/**
 * Files de tâches BullMQ (Redis). Partagé par l'API (ajout des tâches) et le worker (traitement).
 * Les clés BullMQ portent le préfixe `bull:` ; Redis doit tourner en `noeviction`.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        connection: redisConnectionOptions(env.REDIS_URL),
        prefix: 'bull',
      }),
    }),
    BullModule.registerQueue({ name: TRANSCODE_QUEUE }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
