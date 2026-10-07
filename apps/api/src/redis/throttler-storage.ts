import { Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { RedisService } from './redis.service.js';

interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

/**
 * Stockage des limites de débit dans Redis (`rl:`). Si Redis tombe : repli local en mémoire
 * avec les mêmes limites (mode prudent, jamais « ouvert »).
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly local = new Map<
    string,
    { hits: number; expiresAt: number; blockedUntil: number }
  >();

  constructor(private readonly redis: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const hitKey = `rl:${throttlerName}:${key}`;
    if (this.redis.ready) {
      try {
        return await this.incrementRedis(hitKey, ttl, limit, blockDuration);
      } catch {
        // bascule sur le repli local
      }
    }
    return this.incrementLocal(hitKey, ttl, limit, blockDuration);
  }

  private async incrementRedis(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
  ): Promise<ThrottlerStorageRecord> {
    const blockKey = `${key}:blocked`;
    const blockedTtl = await this.redis.client.pttl(blockKey);
    if (blockedTtl > 0) {
      return {
        totalHits: limit + 1,
        timeToExpire: Math.ceil(blockedTtl / 1000),
        isBlocked: true,
        timeToBlockExpire: Math.ceil(blockedTtl / 1000),
      };
    }
    const result = await this.redis.client.multi().incr(key).pttl(key).exec();
    const totalHits = Number(result?.[0]?.[1] ?? 1);
    let pttl = Number(result?.[1]?.[1] ?? -1);
    if (pttl < 0) {
      await this.redis.client.pexpire(key, ttl);
      pttl = ttl;
    }
    if (totalHits > limit) {
      await this.redis.client.set(blockKey, '1', 'PX', blockDuration);
      return {
        totalHits,
        timeToExpire: Math.ceil(pttl / 1000),
        isBlocked: true,
        timeToBlockExpire: Math.ceil(blockDuration / 1000),
      };
    }
    return {
      totalHits,
      timeToExpire: Math.ceil(pttl / 1000),
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }

  private incrementLocal(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
  ): ThrottlerStorageRecord {
    const now = Date.now();
    let entry = this.local.get(key);
    if (!entry || entry.expiresAt <= now) {
      entry = { hits: 0, expiresAt: now + ttl, blockedUntil: 0 };
      this.local.set(key, entry);
    }
    if (entry.blockedUntil > now) {
      const left = Math.ceil((entry.blockedUntil - now) / 1000);
      return {
        totalHits: entry.hits,
        timeToExpire: left,
        isBlocked: true,
        timeToBlockExpire: left,
      };
    }
    entry.hits += 1;
    if (entry.hits > limit) entry.blockedUntil = now + blockDuration;
    if (this.local.size > 50_000) this.prune(now);
    return {
      totalHits: entry.hits,
      timeToExpire: Math.ceil((entry.expiresAt - now) / 1000),
      isBlocked: entry.hits > limit,
      timeToBlockExpire: entry.hits > limit ? Math.ceil(blockDuration / 1000) : 0,
    };
  }

  private prune(now: number): void {
    for (const [k, v] of this.local)
      if (v.expiresAt <= now && v.blockedUntil <= now) this.local.delete(k);
  }
}
