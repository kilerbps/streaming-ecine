import { Body, Controller, Delete, Get, HttpCode, Inject, Patch, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  changePasswordInputSchema,
  deleteMeInputSchema,
  meSchema,
  recoveryCodesSchema,
  twoFactorDisableInputSchema,
  twoFactorEnableInputSchema,
  twoFactorSetupSchema,
  updateMeInputSchema,
  type Me,
  type RecoveryCodes,
  type TwoFactorSetup,
} from '@ecine/contracts';
import type { z } from 'zod';
import { ENV, type Env } from '../config/env.js';
import { BodySchema, Returns } from '../common/contract.decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { SensitiveLimit } from '../rate-limit/sensitive.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';
import { AuthService } from '../auth/auth.service.js';
import { clearAuthCookies } from '../auth/cookies.js';
import { CurrentUser } from '../auth/decorators.js';
import { MeService } from './me.service.js';

@ApiTags('me')
@Controller('me')
export class MeController {
  constructor(
    private readonly me: MeService,
    private readonly auth: AuthService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Get()
  @Returns(meSchema)
  get(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response): Promise<Me> {
    res.setHeader('Cache-Control', 'no-store');
    return this.me.get(user.id);
  }

  @Patch()
  @BodySchema(updateMeInputSchema)
  @Returns(meSchema)
  update(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(updateMeInputSchema)) input: z.infer<typeof updateMeInputSchema>,
  ): Promise<Me> {
    return this.me.update(user.id, input);
  }

  @Post('password')
  @HttpCode(204)
  @SensitiveLimit({ limit: 5, ttlMs: 15 * 60_000 })
  @BodySchema(changePasswordInputSchema)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(changePasswordInputSchema)) input: z.infer<typeof changePasswordInputSchema>,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.me.changePassword(user.id, input.currentPassword, input.newPassword);
    clearAuthCookies(res, this.env.COOKIE_SECURE);
  }

  @Post('resend-verification')
  @HttpCode(202)
  @SensitiveLimit({ limit: 3, ttlMs: 60 * 60_000 })
  async resendVerification(@CurrentUser() user: AuthUser): Promise<void> {
    await this.auth.resendVerification(user.id);
  }

  @Get('export')
  @Throttle({ default: { limit: 5, ttl: 60 * 60_000 } })
  async export(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Record<string, unknown>> {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Disposition', 'attachment; filename="e-cine-mes-donnees.json"');
    return this.me.exportData(user.id);
  }

  @Delete()
  @HttpCode(204)
  @SensitiveLimit({ limit: 5, ttlMs: 15 * 60_000 })
  @BodySchema(deleteMeInputSchema)
  async delete(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(deleteMeInputSchema)) input: z.infer<typeof deleteMeInputSchema>,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.me.delete(user.id, input.password);
    clearAuthCookies(res, this.env.COOKIE_SECURE);
  }

  @Post('2fa/setup')
  @Returns(twoFactorSetupSchema)
  setupTwoFactor(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TwoFactorSetup> {
    res.setHeader('Cache-Control', 'no-store');
    return this.me.setupTwoFactor(user.id);
  }

  /** Activation : renvoie les codes de secours, une seule fois, puis exige une reconnexion. */
  @Post('2fa/enable')
  @HttpCode(200)
  @SensitiveLimit({ limit: 10, ttlMs: 15 * 60_000 })
  @BodySchema(twoFactorEnableInputSchema)
  @Returns(recoveryCodesSchema)
  async enableTwoFactor(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(twoFactorEnableInputSchema))
    input: z.infer<typeof twoFactorEnableInputSchema>,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RecoveryCodes> {
    const codes = await this.me.enableTwoFactor(user.id, input.code);
    res.setHeader('Cache-Control', 'no-store');
    clearAuthCookies(res, this.env.COOKIE_SECURE);
    return codes;
  }

  @Post('2fa/recovery-codes')
  @HttpCode(200)
  @SensitiveLimit({ limit: 5, ttlMs: 15 * 60_000 })
  @BodySchema(twoFactorDisableInputSchema)
  @Returns(recoveryCodesSchema)
  regenerateRecoveryCodes(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(twoFactorDisableInputSchema))
    input: z.infer<typeof twoFactorDisableInputSchema>,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RecoveryCodes> {
    res.setHeader('Cache-Control', 'no-store');
    return this.me.regenerateRecoveryCodes(user.id, input.password, input.code);
  }

  @Post('2fa/disable')
  @HttpCode(204)
  @SensitiveLimit({ limit: 5, ttlMs: 15 * 60_000 })
  @BodySchema(twoFactorDisableInputSchema)
  async disableTwoFactor(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(twoFactorDisableInputSchema))
    input: z.infer<typeof twoFactorDisableInputSchema>,
  ): Promise<void> {
    await this.me.disableTwoFactor(user.id, input.password, input.code);
  }
}
