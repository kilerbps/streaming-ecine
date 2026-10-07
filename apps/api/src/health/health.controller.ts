import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Public } from '../auth/decorators.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';

type Check = 'ok' | 'down';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

/** Santé : base et Redis, sans aucun détail sensible (version, hôte, erreur). */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @SkipThrottle()
  @Get()
  async check(
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ status: string; database: Check; redis: Check }> {
    const database: Check = await withTimeout(this.prisma.$queryRaw`SELECT 1`, 2000).then(
      () => 'ok',
      () => 'down',
    );
    const redis: Check = await withTimeout(this.redis.client.ping(), 1000).then(
      () => 'ok',
      () => 'down',
    );
    res.setHeader('Cache-Control', 'no-store');
    // Redis est un cache jetable : son absence dégrade le service sans l'interrompre.
    if (database === 'down') res.status(HttpStatus.SERVICE_UNAVAILABLE);
    return {
      status: database === 'down' ? 'error' : redis === 'down' ? 'degraded' : 'ok',
      database,
      redis,
    };
  }
}
