import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  deviceVerificationSchema,
  deviceVerifyInputSchema,
  type DeviceVerification,
} from '@ecine/contracts';
import type { z } from 'zod';
import { Public } from '../auth/decorators.js';
import { CaptchaService } from '../common/captcha.service.js';
import { BodySchema, Returns } from '../common/contract.decorators.js';
import { ProblemException } from '../common/problem.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { HOUR } from './policies.js';
import { RateLimitService } from './rate-limit.service.js';
import { SensitiveLimit } from './sensitive.decorator.js';

/**
 * Appareils des visiteurs (ADR-0015). Le cookie d'appareil est signé par le site ; cette route
 * constate seulement une vérification Turnstile réussie. Le site signe ensuite la nouvelle fin de
 * vérification dans le cookie.
 */
@ApiTags('devices')
@Public()
@Controller('devices')
export class DevicesController {
  constructor(
    private readonly captcha: CaptchaService,
    private readonly limits: RateLimitService,
  ) {}

  @Post('verify')
  @HttpCode(200)
  @SensitiveLimit({ limit: 10, ttlMs: HOUR })
  @BodySchema(deviceVerifyInputSchema)
  @Returns(deviceVerificationSchema)
  async verify(
    @Body(new ZodPipe(deviceVerifyInputSchema)) body: z.infer<typeof deviceVerifyInputSchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<DeviceVerification> {
    res.setHeader('Cache-Control', 'no-store');
    if (!req.device) throw ProblemException.badRequest('Appareil inconnu.');
    await this.captcha.assertHuman(body.turnstileToken, req.clientIp);
    const verifiedUntil = await this.limits.verifyDevice(this.limits.identify(req));
    return { verifiedUntil };
  }
}
