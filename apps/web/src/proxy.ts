import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_LOCALE, LOCALES } from '@ecine/contracts';
import { authCookieNames, PREF_COOKIES } from './server/cookie-names';
import { parseSetCookie } from './server/set-cookie';

/**
 * proxy.ts (ex-middleware, Next.js 16, runtime Node.js) — responsabilités (docs/skills/ecine-nextjs-frontend.md) :
 * hôte canonique, langue, CSP avec nonce, renouvellement transparent des jetons, garde légère de /admin.
 * La vraie autorisation reste dans l'API.
 */

const env = {
  apiInternal: process.env.API_INTERNAL_URL ?? 'http://localhost:4000',
  apiPublic: process.env.API_PUBLIC_URL ?? 'http://localhost:4000',
  mediaPublic: process.env.MEDIA_PUBLIC_URL ?? 'http://localhost:4000/media',
  serviceKey: process.env.SERVICE_API_KEY ?? '',
  canonicalHost: process.env.CANONICAL_HOST ?? '',
  secure: process.env.COOKIE_SECURE === 'true',
  dev: process.env.NODE_ENV !== 'production',
};

/** Renouvelle le jeton d'accès s'il expire dans moins de 60 s. */
const REFRESH_MARGIN_SEC = 60;

function origin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

function contentSecurityPolicy(nonce: string): string {
  const api = origin(env.apiPublic);
  const media = origin(env.mediaPublic);
  const turnstile = 'https://challenges.cloudflare.com';
  const apiAndMedia = [...new Set([api, media])].join(' ');
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${turnstile}${env.dev ? " 'unsafe-eval'" : ''}`,
    // En développement, le rechargement à chaud injecte des <style> sans nonce ; en production : nonce strict.
    env.dev ? "style-src 'self' 'unsafe-inline'" : `style-src 'self' 'nonce-${nonce}'`,
    // Attributs style (positionnement des primitives Radix, next/image) : risque faible, pas de <style> injecté.
    "style-src-attr 'unsafe-inline'",
    `img-src 'self' data: blob: ${media}`,
    `media-src 'self' blob: ${apiAndMedia}`,
    `connect-src 'self' ${apiAndMedia} ${turnstile}`,
    "font-src 'self'",
    `frame-src ${turnstile}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  // Seulement en HTTPS (cookies Secure) : en HTTP local, la directive casserait les images de l'API.
  if (env.secure) directives.push('upgrade-insecure-requests');
  return directives.join('; ');
}

function accessExpiresSoon(token: string | undefined): boolean {
  if (!token) return true;
  try {
    const payload = JSON.parse(
      atob(token.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/')),
    ) as { exp?: number };
    return !payload.exp || payload.exp - Date.now() / 1000 < REFRESH_MARGIN_SEC;
  } catch {
    return true;
  }
}

interface CookieChange {
  name: string;
  value: string | null;
  header?: string;
}

/** Échange le refresh token contre une nouvelle paire (rotation côté API). */
async function refreshSession(
  request: NextRequest,
  refreshName: string,
  refreshValue: string,
): Promise<CookieChange[] | null> {
  try {
    const res = await fetch(`${env.apiInternal}/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        cookie: `${refreshName}=${encodeURIComponent(refreshValue)}`,
        'x-service-key': env.serviceKey,
        'x-client-ip': request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '',
        'x-client-user-agent': request.headers.get('user-agent')?.slice(0, 255) ?? '',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 401) return [];
    if (!res.ok) return null;
    return res.headers
      .getSetCookie()
      .map((header) => ({ header, parsed: parseSetCookie(header) }))
      .filter((c) => c.parsed !== null)
      .map(({ header, parsed }) => ({
        name: parsed!.name,
        value: parsed!.maxAge === 0 ? null : parsed!.value,
        header,
      }));
  } catch {
    // API injoignable : on laisse passer, l'API répondra 401 si besoin (échec fermé côté API).
    return null;
  }
}

function localeOf(pathname: string): string | null {
  const first = pathname.split('/')[1] ?? '';
  return (LOCALES as readonly string[]).includes(first) ? first : null;
}

function randomSeed(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Hôte canonique (production) : une seule URL par contenu.
  const host = request.headers.get('host') ?? '';
  if (env.canonicalHost && host && host !== env.canonicalHost) {
    return NextResponse.redirect(`https://${env.canonicalHost}${pathname}${search}`, 301);
  }

  // Langue : toute page publique vit sous /{locale}.
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  const locale = localeOf(pathname);
  if (!isAdmin && !locale) {
    const target = request.nextUrl.clone();
    target.pathname = `/${DEFAULT_LOCALE}${pathname === '/' ? '' : pathname}`;
    return NextResponse.redirect(target, 308);
  }

  const names = authCookieNames(env.secure);
  const access = request.cookies.get(names.access)?.value;
  const refresh = request.cookies.get(names.refresh)?.value;

  // Garde légère de l'administration (la vérification réelle du rôle est faite par l'API).
  if (isAdmin && !access && !refresh) {
    const login = request.nextUrl.clone();
    login.pathname = `/${DEFAULT_LOCALE}/compte/connexion`;
    login.search = `?retour=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(login, 307);
  }

  // Renouvellement transparent de la session.
  const changes: CookieChange[] = [];
  if (refresh && accessExpiresSoon(access)) {
    const refreshed = await refreshSession(request, names.refresh, refresh);
    if (refreshed && refreshed.length === 0) {
      changes.push({ name: names.access, value: null }, { name: names.refresh, value: null });
    } else if (refreshed) {
      changes.push(...refreshed);
    }
  }

  // Graine du tirage « surprise » du feed : stable pendant la visite.
  const seed = request.cookies.get(PREF_COOKIES.seed)?.value;
  if (!seed) changes.push({ name: PREF_COOKIES.seed, value: randomSeed() });

  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);
  requestHeaders.set('X-NEXT-INTL-LOCALE', locale ?? DEFAULT_LOCALE);
  requestHeaders.set('x-pathname', pathname);
  if (changes.length > 0) {
    const jar = new Map(request.cookies.getAll().map((c) => [c.name, c.value]));
    for (const change of changes) {
      if (change.value === null) jar.delete(change.name);
      else jar.set(change.name, change.value);
    }
    requestHeaders.set(
      'cookie',
      [...jar].map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('; '),
    );
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  for (const change of changes) {
    if (change.header) response.headers.append('Set-Cookie', change.header);
    else if (change.value === null) response.cookies.delete(change.name);
    else
      response.cookies.set({
        name: change.name,
        value: change.value,
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: env.secure,
        maxAge: 60 * 60 * 6,
      });
  }
  if (isAdmin) response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export const config = {
  matcher: [
    {
      source:
        '/((?!api/|_next/static|_next/image|favicon\\.ico|icon\\.svg|apple-icon\\.png|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|sw\\.js|icons/|sounds/|ads\\.txt).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
