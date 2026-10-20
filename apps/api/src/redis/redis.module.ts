import { Global, Module } from '@nestjs/common';
import { GcraStore } from '../rate-limit/gcra-store.js';
import { CacheService } from './cache.service.js';
import { RedisService } from './redis.service.js';
import { RedisThrottlerStorage } from './throttler-storage.js';

@Global()
@Module({
  providers: [RedisService, CacheService, GcraStore, RedisThrottlerStorage],
  exports: [RedisService, CacheService, GcraStore, RedisThrottlerStorage],
})
export class RedisModule {}
