import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AdminModule } from './admin/admin.module.js';
import { AuditModule } from './audit/audit.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AuthGuard, OriginGuard, RolesGuard } from './auth/guards.js';
import { RelayMiddleware } from './common/relay.middleware.js';
import { ReturnsInterceptor } from './common/contract.decorators.js';
import { ProblemDetailsFilter } from './common/problem-details.filter.js';
import { ConfigModule } from './config/config.module.js';
import { ENV, type Env } from './config/env.js';
import { ContentModule } from './content/content.module.js';
import { HealthController } from './health/health.controller.js';
import { loggerParams } from './logging/logger.config.js';
import { MailModule } from './mail/mail.module.js';
import { PushModule } from './push/push.module.js';
import { MediaModule } from './media/media.module.js';
import { PlaybackModule } from './playback/playback.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { QueueModule } from './queue/queue.module.js';
import { FloodGuard, IdentityThrottlerGuard } from './rate-limit/guards.js';
import { GENERAL, MINUTE } from './rate-limit/policies.js';
import { RateLimitModule } from './rate-limit/rate-limit.module.js';
import { RedisModule } from './redis/redis.module.js';
import { RedisThrottlerStorage } from './redis/throttler-storage.js';
import { ContentEventsModule } from './revalidate/content-events.service.js';

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({ inject: [ENV], useFactory: (env: Env) => loggerParams(env) }),
    PrismaModule,
    RedisModule,
    ThrottlerModule.forRootAsync({
      inject: [RedisThrottlerStorage],
      useFactory: (storage: RedisThrottlerStorage) => ({
        // Limite générale par identité (ADR-0015) ; les routes précisent la leur avec @Throttle.
        throttlers: [{ name: 'default', ttl: MINUTE, limit: GENERAL.identity }],
        storage,
      }),
    }),
    RateLimitModule,
    MailModule,
    PushModule,
    AuditModule,
    ContentEventsModule,
    AuthModule,
    ContentModule,
    PlaybackModule,
    QueueModule,
    MediaModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [
    // Ordre : origine → plafond anti-inondation par IP → authentification (refus par défaut) →
    // limites par identité (le compte n'est connu qu'après l'authentification) → rôle.
    { provide: APP_GUARD, useClass: OriginGuard },
    { provide: APP_GUARD, useClass: FloodGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: IdentityThrottlerGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: ReturnsInterceptor },
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RelayMiddleware).forRoutes('*');
  }
}
