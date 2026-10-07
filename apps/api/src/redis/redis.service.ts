import { Inject, Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ENV, type Env } from '../config/env.js';

/**
 * Redis = copie jetable (docs/skills/ecine-redis-cache.md). Toute clé porte un préfixe et un TTL.
 * L'application doit fonctionner si Redis est vide ou indisponible.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor(@Inject(ENV) env: Env) {
    this.client = new Redis(env.REDIS_URL, {
      lazyConnect: false,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 2000,
      commandTimeout: 1000,
    });
    this.client.on('error', (err: Error) =>
      this.logger.warn(`Redis indisponible : ${err.message}`),
    );
  }

  get ready(): boolean {
    return this.client.status === 'ready';
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => this.client.disconnect());
  }
}
