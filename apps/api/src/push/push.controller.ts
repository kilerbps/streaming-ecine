import { Body, Controller, Delete, Get, HttpCode, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  pushKeySchema,
  pushSubscriptionInputSchema,
  pushUnsubscribeSchema,
  type PushKey,
  type PushSubscriptionInput,
} from '@ecine/contracts';
import type { z } from 'zod';
import { BodySchema, Returns } from '../common/contract.decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser, Public } from '../auth/decorators.js';
import { PushService } from './push.service.js';

@ApiTags('push')
@Controller()
export class PushController {
  constructor(private readonly push: PushService) {}

  /** Clé publique VAPID pour l'abonnement du navigateur (`null` : notifications désactivées). */
  @Public()
  @Get('push/key')
  @Returns(pushKeySchema)
  key(@Res({ passthrough: true }) res: Response): PushKey {
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return { publicKey: this.push.publicKey() };
  }

  @Post('me/push-subscriptions')
  @HttpCode(204)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @BodySchema(pushSubscriptionInputSchema)
  async subscribe(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(pushSubscriptionInputSchema)) input: PushSubscriptionInput,
  ): Promise<void> {
    await this.push.subscribe(user.id, input);
  }

  @Delete('me/push-subscriptions')
  @HttpCode(204)
  @BodySchema(pushUnsubscribeSchema)
  async unsubscribe(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(pushUnsubscribeSchema)) input: z.infer<typeof pushUnsubscribeSchema>,
  ): Promise<void> {
    await this.push.unsubscribe(user.id, input.endpoint);
  }
}
