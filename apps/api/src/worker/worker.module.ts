import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ConfigModule } from '../config/config.module.js';
import { ENV, type Env } from '../config/env.js';
import { loggerParams } from '../logging/logger.config.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { QueueModule } from '../queue/queue.module.js';
import { RedisModule } from '../redis/redis.module.js';
import { ContentEventsModule } from '../revalidate/content-events.service.js';
import { PreviewGenerator } from './preview.generator.js';
import { TranscodeProcessor } from './transcode.processor.js';

/** Processus worker (sans HTTP) : consomme la file `transcode` (transcodage et aperçus). */
@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({ inject: [ENV], useFactory: (env: Env) => loggerParams(env) }),
    PrismaModule,
    RedisModule,
    ContentEventsModule,
    QueueModule,
  ],
  providers: [TranscodeProcessor, PreviewGenerator],
})
export class WorkerModule {}
