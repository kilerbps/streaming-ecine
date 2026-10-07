import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service.js';

const VERSION_TTL_SEC = 60 * 60 * 24 * 30;

/**
 * Cache dérivé `cache:` avec espaces de noms versionnés : invalider un espace = incrémenter sa version
 * (O(1), pas de SCAN). Les entrées expirent seules (TTL avec gigue anti-avalanche).
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(private readonly redis: RedisService) {}

  async wrap<T>(
    namespace: string,
    key: string,
    ttlSec: number,
    load: () => Promise<T>,
  ): Promise<T> {
    const fullKey = await this.key(namespace, key);
    if (fullKey) {
      try {
        const hit = await this.redis.client.get(fullKey);
        if (hit !== null) return JSON.parse(hit) as T;
      } catch (err) {
        this.logger.debug(`Lecture du cache ignorée : ${(err as Error).message}`);
      }
    }
    const value = await load();
    if (fullKey) {
      const jitter = Math.floor(Math.random() * Math.max(1, ttlSec * 0.1));
      this.redis.client
        .set(fullKey, JSON.stringify(value), 'EX', ttlSec + jitter)
        .catch(() => undefined);
    }
    return value;
  }

  /** Invalide un ou plusieurs espaces de noms (après une écriture admin). */
  async invalidate(...namespaces: string[]): Promise<void> {
    if (!this.redis.ready) return;
    const pipeline = this.redis.client.pipeline();
    for (const ns of namespaces) {
      pipeline.incr(`cache:ver:${ns}`);
      pipeline.expire(`cache:ver:${ns}`, VERSION_TTL_SEC);
    }
    await pipeline.exec().catch(() => undefined);
  }

  private async key(namespace: string, key: string): Promise<string | null> {
    if (!this.redis.ready) return null;
    try {
      const version = (await this.redis.client.get(`cache:ver:${namespace}`)) ?? '0';
      return `cache:${namespace}:${version}:${key}`;
    } catch {
      return null;
    }
  }
}
