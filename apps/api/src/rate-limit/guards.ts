import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  type ThrottlerLimitDetail,
  type ThrottlerModuleOptions,
  type ThrottlerStorage,
} from '@nestjs/throttler';
import type { Request } from 'express';
import { RateLimitService, type SensitiveOptions } from './rate-limit.service.js';
import { SENSITIVE } from './sensitive.decorator.js';

/** Métadonnée posée par `@SkipThrottle()` (constante non exportée par @nestjs/throttler). */
const SKIP_DEFAULT = 'THROTTLER:SKIPdefault';

/** Lecture interne du serveur Next.js (relais signé, sans visiteur) : jamais limitée. */
function internalRead(req: Request): boolean {
  return Boolean(req.fromService && !req.relayedVisitor && req.method === 'GET');
}

/**
 * Plafond anti-inondation par IP et par classe de réseau (ADR-0015), placé avant
 * l'authentification et toujours appliqué. Les routes de lecture vidéo (`@SkipThrottle`) ont leurs
 * propres quotas par session.
 */
@Injectable()
export class FloodGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly limits: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    if (internalRead(req)) return true;
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_DEFAULT, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!skip) await this.limits.flood(this.limits.network(req));
    return true;
  }
}

/**
 * Limites par route, comptées par identité (compte, appareil, sinon IP) et non plus par IP, placées
 * après l'authentification. En observation, un dépassement est journalisé sans bloquer, sauf sur
 * les routes sensibles, qui ont aussi un plafond par IP.
 */
@Injectable()
export class IdentityThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storage: ThrottlerStorage,
    reflector: Reflector,
    private readonly limits: RateLimitService,
  ) {
    super(options, storage, reflector);
  }

  private sensitive(context: ExecutionContext): SensitiveOptions | undefined {
    return this.reflector.getAllAndOverride<SensitiveOptions | undefined>(SENSITIVE, [
      context.getHandler(),
      context.getClass(),
    ]);
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const sensitive = this.sensitive(context);
    const allowed = await super.canActivate(context);
    if (sensitive && !internalRead(req)) {
      const route = `${context.getClass().name}.${context.getHandler().name}`;
      await this.limits.sensitiveIp(route, this.limits.identify(req), sensitive);
    }
    return allowed;
  }

  protected override shouldSkip(context: ExecutionContext): Promise<boolean> {
    return Promise.resolve(internalRead(context.switchToHttp().getRequest<Request>()));
  }

  protected override getTracker(req: Record<string, unknown>): Promise<string> {
    return Promise.resolve(this.limits.identify(req as unknown as Request).key);
  }

  protected override throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const req = context.switchToHttp().getRequest<Request>();
    const route = `${context.getClass().name}.${context.getHandler().name}`;
    // Lève un 429 si les limites sont appliquées ou si la route est sensible ; sinon journalise.
    this.limits.refuse(
      `route:${route}`,
      this.limits.identify(req),
      'identity',
      detail.timeToBlockExpire * 1000,
      detail.tracker,
      Boolean(this.sensitive(context)),
    );
    return Promise.resolve();
  }
}
