import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service.js';
import { RedisService } from './redis.service.js';
import { RedisThrottlerStorage } from './throttler-storage.js';

@Global()
@Module({
  providers: [RedisService, CacheService, RedisThrottlerStorage],
  exports: [RedisService, CacheService, RedisThrottlerStorage],
})
export class RedisModule {}
