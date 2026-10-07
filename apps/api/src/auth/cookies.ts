import type { CookieOptions, Request, Response } from 'express';
import { AUTH_COOKIES } from '@ecine/contracts';

/** Préfixe `__Host-` quand les cookies sont `Secure` (HTTPS) : pas de Domain, Path=/ imposés par le navigateur. */
export function cookieName(base: string, secure: boolean): string {
  return secure ? `__Host-${base}` : base;
}

function options(secure: boolean, maxAgeSec: number): CookieOptions {
  return { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: maxAgeSec * 1000 };
}

export function setAuthCookies(
  res: Response,
  secure: boolean,
  tokens: { access: string; accessTtlSec: number; refresh: string; refreshTtlSec: number },
): void {
  res.cookie(
    cookieName(AUTH_COOKIES.access, secure),
    tokens.access,
    options(secure, tokens.accessTtlSec),
  );
  res.cookie(
    cookieName(AUTH_COOKIES.refresh, secure),
    tokens.refresh,
    options(secure, tokens.refreshTtlSec),
  );
}

export function clearAuthCookies(res: Response, secure: boolean): void {
  for (const base of [AUTH_COOKIES.access, AUTH_COOKIES.refresh]) {
    res.clearCookie(cookieName(base, secure), {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
    });
  }
}

function readCookie(req: Request, name: string): string | undefined {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Jeton d'accès : cookie HttpOnly (navigateur via Next.js) ou en-tête Authorization (clients natifs futurs). */
export function readAccessToken(req: Request, secure: boolean): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return readCookie(req, cookieName(AUTH_COOKIES.access, secure));
}

export function readRefreshToken(req: Request, secure: boolean): string | undefined {
  return readCookie(req, cookieName(AUTH_COOKIES.refresh, secure));
}
