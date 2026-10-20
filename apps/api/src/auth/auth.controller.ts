import { Body, Controller, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  authResultSchema,
  forgotPasswordInputSchema,
  loginInputSchema,
  registerInputSchema,
  resetPasswordInputSchema,
  verifyEmailInputSchema,
  type AuthResult,
} from '@ecine/contracts';
import { z } from 'zod';
import { ENV, type Env } from '../config/env.js';
import { BodySchema, Returns } from '../common/contract.decorators.js';
import { ProblemException } from '../common/problem.js';
import { clientInfo } from '../common/request.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { SensitiveLimit } from '../rate-limit/sensitive.decorator.js';
import { AuthService } from './auth.service.js';
import { clearAuthCookies, readRefreshToken, setAuthCookies } from './cookies.js';
import { Public } from './decorators.js';
import { SessionService } from './session.service.js';

const MINUTE = 60_000;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Public()
  @Post('register')
  // ADR-0015 : 3 par heure et par appareil ; par IP 30 (RDC) / 10 / 3 (hébergeurs) ; refusée sans Redis.
  @SensitiveLimit({
    limit: 3,
    ttlMs: 60 * MINUTE,
    ip: { rdc: 30, other: 10, hosting: 3 },
    failClosed: true,
  })
  @BodySchema(registerInputSchema)
  @Returns(authResultSchema)
  async register(
    @Body(new ZodPipe(registerInputSchema)) input: z.infer<typeof registerInputSchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResult> {
    const { me, tokens } = await this.auth.register(input, clientInfo(req));
    setAuthCookies(res, this.env.COOKIE_SECURE, tokens);
    res.status(201);
    return { user: me };
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @SensitiveLimit({ limit: 10, ttlMs: MINUTE })
  @BodySchema(loginInputSchema)
  @Returns(authResultSchema)
  async login(
    @Body(new ZodPipe(loginInputSchema)) input: z.infer<typeof loginInputSchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResult> {
    const { me, tokens } = await this.auth.login(input, clientInfo(req));
    setAuthCookies(res, this.env.COOKIE_SECURE, tokens);
    return { user: me };
  }

  @Public()
  @Post('refresh')
  @HttpCode(204)
  @Throttle({ default: { limit: 30, ttl: MINUTE } })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const token = readRefreshToken(req, this.env.COOKIE_SECURE);
    const tokens = token ? await this.sessions.rotate(token, clientInfo(req)) : null;
    if (!tokens) {
      clearAuthCookies(res, this.env.COOKIE_SECURE);
      throw ProblemException.unauthorized('Session expirée. Reconnectez-vous.');
    }
    setAuthCookies(res, this.env.COOKIE_SECURE, tokens);
  }

  /** Déconnexion propre : révocation de la famille de sessions côté serveur + effacement des cookies. */
  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const token = readRefreshToken(req, this.env.COOKIE_SECURE);
    if (token) await this.sessions.revokeByRefresh(token);
    else if (req.user) await this.sessions.revokeFamily(req.user.family);
    clearAuthCookies(res, this.env.COOKIE_SECURE);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(204)
  @Throttle({ default: { limit: 10, ttl: MINUTE } })
  @BodySchema(verifyEmailInputSchema)
  async verifyEmail(
    @Body(new ZodPipe(verifyEmailInputSchema)) input: z.infer<typeof verifyEmailInputSchema>,
  ): Promise<void> {
    await this.auth.verifyEmail(input.token);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(202)
  @SensitiveLimit({ limit: 3, ttlMs: 15 * MINUTE })
  @BodySchema(forgotPasswordInputSchema)
  async forgotPassword(
    @Body(new ZodPipe(forgotPasswordInputSchema)) input: z.infer<typeof forgotPasswordInputSchema>,
  ): Promise<void> {
    await this.auth.forgotPassword(input.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(204)
  @SensitiveLimit({ limit: 5, ttlMs: 15 * MINUTE })
  @BodySchema(resetPasswordInputSchema)
  async resetPassword(
    @Body(new ZodPipe(resetPasswordInputSchema)) input: z.infer<typeof resetPasswordInputSchema>,
  ): Promise<void> {
    await this.auth.resetPassword(input.token, input.password);
  }
}
