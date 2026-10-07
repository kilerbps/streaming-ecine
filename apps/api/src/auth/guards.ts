import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { hasRole, type Role } from '@ecine/contracts';
import { ENV, type Env } from '../config/env.js';
import { safeEqual } from '../common/crypto.js';
import { PROBLEM_TYPES, ProblemException } from '../common/problem.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { readAccessToken } from './cookies.js';
import { IS_PUBLIC, MIN_ROLE, SERVICE_ONLY } from './decorators.js';
import { SessionService } from './session.service.js';
import { TokensService } from './tokens.service.js';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Refus des requêtes navigateur venant d'une origine non autorisée (renfort anti-CSRF).
 * Les appels serveur à serveur (Next.js) n'envoient pas d'en-tête Origin.
 */
@Injectable()
export class OriginGuard implements CanActivate {
  private readonly allowed: Set<string>;

  constructor(@Inject(ENV) env: Env) {
    this.allowed = new Set(
      [
        env.APP_URL,
        ...env.CORS_ORIGINS.split(',')
          .map((o) => o.trim())
          .filter(Boolean),
      ].map((o) => new URL(o).origin),
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const origin = req.headers.origin;
    if (!UNSAFE_METHODS.has(req.method) || !origin) return true;
    if (this.allowed.has(origin)) return true;
    throw ProblemException.forbidden('Origine non autorisée.');
  }
}

/** Authentification par défaut sur toutes les routes (refus par défaut) ; `@Public()` pour l'ouvrir. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokensService,
    private readonly sessions: SessionService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const targets = [context.getHandler(), context.getClass()];

    if (this.reflector.getAllAndOverride<boolean>(SERVICE_ONLY, targets)) {
      const key = req.headers['x-service-key'];
      if (typeof key === 'string' && safeEqual(key, this.env.SERVICE_API_KEY)) return true;
      throw ProblemException.forbidden();
    }

    const token = readAccessToken(req, this.env.COOKIE_SECURE);
    if (token) {
      const user = await this.tokens.verifyAccess(token);
      if (user && !(await this.sessions.isFamilyRevoked(user.family))) req.user = user;
    }

    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;
    if (!req.user) throw ProblemException.unauthorized();
    return true;
  }
}

/** Contrôle du rôle minimum, relu en base (un changement de rôle s'applique immédiatement) + 2FA admin. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const minimum = this.reflector.getAllAndOverride<Role | undefined>(MIN_ROLE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!minimum) return true;
    const req = context.switchToHttp().getRequest<Request>();
    if (!req.user) throw ProblemException.unauthorized();

    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true, disabledAt: true, deletedAt: true },
    });
    if (!user || user.disabledAt || user.deletedAt || !hasRole(user.role, minimum)) {
      throw ProblemException.forbidden();
    }
    if (this.env.ADMIN_MFA_REQUIRED && hasRole(user.role, 'ADMIN') && !req.user.mfa) {
      throw new ProblemException({
        type: PROBLEM_TYPES.mfaRequired,
        title: 'Double authentification requise',
        status: 403,
        detail:
          'Activez la double authentification puis reconnectez-vous pour accéder à l’administration.',
      });
    }
    req.user.role = user.role;
    return true;
  }
}
