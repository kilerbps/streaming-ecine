import { Inject, Injectable } from '@nestjs/common';
import { jwtVerify, SignJWT } from 'jose';
import { roleSchema } from '@ecine/contracts';
import { z } from 'zod';
import { ENV, type Env } from '../config/env.js';
import type { AuthUser } from './auth.types.js';

export const ACCESS_TTL_SEC = 15 * 60;
export const REFRESH_TTL_SEC = 30 * 24 * 60 * 60;
/** Session plus courte pour les comptes d'administration. */
export const ADMIN_REFRESH_TTL_SEC = 12 * 60 * 60;

const ISSUER = 'ecine-api';
const AUDIENCE = 'ecine';

const claimsSchema = z.object({
  sub: z.string(),
  role: roleSchema,
  fam: z.string(),
  mfa: z.boolean(),
  typ: z.literal('at'),
});

/** Jeton d'accès JWT court (HS256). Jamais stocké dans le navigateur hors cookie HttpOnly. */
@Injectable()
export class TokensService {
  private readonly key: Uint8Array;

  constructor(@Inject(ENV) env: Env) {
    this.key = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
  }

  signAccess(user: AuthUser): Promise<string> {
    return new SignJWT({ role: user.role, fam: user.family, mfa: user.mfa, typ: 'at' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(`${ACCESS_TTL_SEC}s`)
      .sign(this.key);
  }

  /** Retourne null pour tout jeton invalide, expiré ou mal formé (échec fermé). */
  async verifyAccess(token: string): Promise<AuthUser | null> {
    try {
      const { payload } = await jwtVerify(token, this.key, {
        issuer: ISSUER,
        audience: AUDIENCE,
        algorithms: ['HS256'],
      });
      const claims = claimsSchema.parse(payload);
      return { id: claims.sub, role: claims.role, family: claims.fam, mfa: claims.mfa };
    } catch {
      return null;
    }
  }
}
