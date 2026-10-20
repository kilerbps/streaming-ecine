import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import type { Role } from '@ecine/contracts';
import { ProblemException } from '../common/problem.js';
import type { AuthUser } from './auth.types.js';

export const IS_PUBLIC = 'ecine:public';
export const MIN_ROLE = 'ecine:min-role';
export const SERVICE_ONLY = 'ecine:service-only';

/** Route accessible sans compte (l'utilisateur est tout de même identifié s'il est connecté). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Rôle minimum exigé (hiérarchie : SUPER_ADMIN > ADMIN > EDITOR > MODERATOR). Vérifié en base à chaque appel. */
export const Roles = (minimum: Role) => SetMetadata(MIN_ROLE, minimum);

/** Route interne réservée au serveur Next.js (relais signé, voir RelayMiddleware). */
export const ServiceOnly = () => SetMetadata(SERVICE_ONLY, true);

/** Utilisateur connecté (route protégée : toujours défini). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const user = ctx.switchToHttp().getRequest<Request>().user;
    if (!user) throw ProblemException.unauthorized();
    return user;
  },
);

/** Utilisateur connecté éventuel (route publique). */
export const OptionalUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | null =>
    ctx.switchToHttp().getRequest<Request>().user ?? null,
);
