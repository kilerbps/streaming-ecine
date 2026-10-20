import { Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { gcraParams } from '../rate-limit/gcra.js';
import { GcraStore } from '../rate-limit/gcra-store.js';

interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

/**
 * Stockage des limites par route de `@nestjs/throttler`, en limite à seau (ADR-0015) : « `limit`
 * par `ttl` » avec une rafale de la moitié du quota, sans fenêtres fixes. Le blocage dure le temps
 * qu'une place se libère (`blockDuration` n'est plus utilisé).
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly store: GcraStore) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    _blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const outcome = await this.store.take([
      { key: `${throttlerName}:${key}`, params: gcraParams({ limit, periodMs: ttl }) },
    ]);
    const ttlSec = Math.ceil(ttl / 1000);
    if (outcome.allowed) {
      return { totalHits: 1, timeToExpire: ttlSec, isBlocked: false, timeToBlockExpire: 0 };
    }
    const wait = Math.max(1, Math.ceil(outcome.retryAfterMs / 1000));
    return { totalHits: limit + 1, timeToExpire: wait, isBlocked: true, timeToBlockExpire: wait };
  }
}
