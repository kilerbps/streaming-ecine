import { Body, Controller, HttpCode, Inject, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import {
  analyticsEventInputSchema,
  consentInputSchema,
  contactInputSchema,
} from '@ecine/contracts';
import type { z } from 'zod';
import { ENV, type Env } from '../config/env.js';
import { CaptchaService } from '../common/captcha.service.js';
import { BodySchema } from '../common/contract.decorators.js';
import { hashIp } from '../common/crypto.js';
import { ProblemException } from '../common/problem.js';
import { deviceCategory } from '../common/request.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { Public } from '../auth/decorators.js';
import { MailService } from '../mail/mail.service.js';
import { mailTemplates } from '../mail/mail.templates.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Délai minimal de saisie : un humain met plus de 3 s à remplir le formulaire. */
const MIN_FILL_MS = 3000;

@ApiTags('forms')
@Public()
@Controller()
export class FormsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly captcha: CaptchaService,
    private readonly mail: MailService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Contact (FR-070/072) : pot de miel (schéma), délai minimal, Turnstile, limite de débit, accusé de réception. */
  @Post('contact')
  @HttpCode(202)
  @Throttle({ default: { limit: 5, ttl: 60 * 60_000 } })
  @BodySchema(contactInputSchema)
  async contact(
    @Body(new ZodPipe(contactInputSchema)) input: z.infer<typeof contactInputSchema>,
    @Req() req: Request,
  ): Promise<void> {
    const elapsed = Date.now() - input.renderedAt;
    if (elapsed < MIN_FILL_MS || elapsed > 24 * 60 * 60 * 1000) {
      throw ProblemException.badRequest(
        'Le formulaire a expiré ou a été envoyé trop vite. Rechargez la page.',
      );
    }
    await this.captcha.assertHuman(input.turnstileToken, req.clientIp);
    await this.prisma.contactMessage.create({
      data: {
        name: input.name,
        email: input.email,
        subject: input.subject,
        body: input.message,
        ipHash: hashIp(req.clientIp, this.env.IP_HASH_SALT),
      },
    });
    await this.mail
      .send(mailTemplates.contactAck(input.email, input.name, input.subject))
      .catch(() => undefined);
  }

  /** Preuve du consentement cookies (ConsentRecord). */
  @Post('consent')
  @HttpCode(204)
  @Throttle({ default: { limit: 20, ttl: 60 * 60_000 } })
  @BodySchema(consentInputSchema)
  async consent(
    @Body(new ZodPipe(consentInputSchema)) input: z.infer<typeof consentInputSchema>,
    @Req() req: Request,
  ): Promise<void> {
    await this.prisma.consentRecord.create({
      data: {
        anonId: input.anonId,
        userId: req.user?.id ?? null,
        version: input.version,
        categories: input.categories,
      },
    });
  }

  /**
   * Événement d'audience agrégé, sans identifiant personnel. Le serveur Next.js n'appelle cette route
   * que si le visiteur a consenti à la mesure d'audience.
   */
  @Post('analytics/events')
  @HttpCode(204)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @BodySchema(analyticsEventInputSchema)
  async event(
    @Body(new ZodPipe(analyticsEventInputSchema)) input: z.infer<typeof analyticsEventInputSchema>,
    @Req() req: Request,
  ): Promise<void> {
    const ua = req.clientUserAgent;
    let referrer: string | null = null;
    if (input.referrer) {
      try {
        referrer = new URL(input.referrer).hostname;
      } catch {
        referrer = null;
      }
    }
    await this.prisma.analyticsEvent.create({
      data: {
        type: input.type,
        path: input.path?.split('?')[0] ?? null,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        referrer,
        device: deviceCategory(ua),
      },
    });
  }
}
