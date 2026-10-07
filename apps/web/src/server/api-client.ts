import 'server-only';
import { cookies, headers } from 'next/headers';
import type { Problem } from '@ecine/contracts';
import type { z } from 'zod';
import { serverConfig } from './config';
import { authCookieNames } from './cookie-names';
import { parseSetCookie } from './set-cookie';

/**
 * Seul point d'accès à l'API (règle R1 : les composants clients ne chargent jamais de données).
 * - `publicGet` : lecture publique, mise en cache par Next.js avec des étiquettes revalidées par l'API.
 * - `privateRequest` : requête au nom du visiteur (cookies relayés), jamais mise en cache.
 * Chaque réponse est validée par le schéma Zod de `@ecine/contracts`.
 */

export class ApiError extends Error {
  constructor(public readonly problem: Problem) {
    super(problem.detail ?? problem.title);
  }
  get status(): number {
    return this.problem.status;
  }
}

const TIMEOUT_MS = 10_000;

function url(path: string, query?: Record<string, string | number | undefined | null>): string {
  const target = new URL(`/v1${path}`, serverConfig().API_INTERNAL_URL);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '')
      target.searchParams.set(key, String(value));
  }
  return target.toString();
}

async function toProblem(res: Response): Promise<Problem> {
  try {
    const body = (await res.json()) as Partial<Problem>;
    return {
      type: body.type ?? 'about:blank',
      title: body.title ?? 'Erreur',
      status: res.status,
      detail: body.detail,
      errors: body.errors,
    };
  } catch {
    return { type: 'about:blank', title: 'Erreur', status: res.status };
  }
}

/** Lecture publique en cache (aucun cookie : la réponse est partagée entre visiteurs). */
export async function publicGet<T extends z.ZodType>(
  schema: T,
  path: string,
  options: {
    query?: Record<string, string | number | undefined | null>;
    tags?: string[];
    revalidate?: number;
  } = {},
): Promise<z.infer<T>> {
  const res = await fetch(url(path, options.query), {
    headers: { accept: 'application/json', 'x-service-key': serverConfig().SERVICE_API_KEY },
    next: { revalidate: options.revalidate ?? 300, tags: options.tags ?? [] },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new ApiError(await toProblem(res));
  return schema.parse(await res.json());
}

/** En-têtes du visiteur : IP et agent réels (limites par IP côté API), cookies d'authentification. */
async function visitorHeaders(): Promise<Record<string, string>> {
  const [h, jar] = await Promise.all([headers(), cookies()]);
  const names = authCookieNames(serverConfig().COOKIE_SECURE);
  const out: Record<string, string> = {
    accept: 'application/json',
    'x-service-key': serverConfig().SERVICE_API_KEY,
  };
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip');
  if (ip) out['x-client-ip'] = ip;
  const ua = h.get('user-agent');
  if (ua) out['x-client-user-agent'] = ua.slice(0, 255);
  const lang = h.get('x-next-intl-locale');
  if (lang) out['accept-language'] = lang;
  const auth = [names.access, names.refresh]
    .map((name) => jar.get(name))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map((c) => `${c.name}=${encodeURIComponent(c.value)}`);
  if (auth.length > 0) out.cookie = auth.join('; ');
  return out;
}

export interface PrivateRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Record<string, string | number | undefined | null>;
  body?: unknown;
  rawBody?: {
    data: Blob | ArrayBuffer | Uint8Array;
    contentType: string;
    headers?: Record<string, string>;
  };
  /** Relaie les Set-Cookie de l'API vers le navigateur (Server Actions et Route Handlers uniquement). */
  relayCookies?: boolean;
}

export async function privateRequest<T extends z.ZodType | null>(
  schema: T,
  path: string,
  options: PrivateRequestOptions = {},
): Promise<T extends z.ZodType ? z.infer<T> : null> {
  const init: RequestInit = {
    method: options.method ?? 'GET',
    headers: await visitorHeaders(),
    cache: 'no-store',
    signal: AbortSignal.timeout(options.rawBody ? 60_000 : TIMEOUT_MS),
  };
  const h = init.headers as Record<string, string>;
  if (options.rawBody) {
    h['content-type'] = options.rawBody.contentType;
    Object.assign(h, options.rawBody.headers ?? {});
    init.body = options.rawBody.data as BodyInit;
  } else if (options.body !== undefined) {
    h['content-type'] = 'application/json';
    init.body = JSON.stringify(options.body);
  }
  const res = await fetch(url(path, options.query), init);
  if (options.relayCookies) await relaySetCookies(res);
  if (!res.ok) throw new ApiError(await toProblem(res));
  if (schema === null || res.status === 204) return null as T extends z.ZodType ? z.infer<T> : null;
  return schema.parse(await res.json()) as T extends z.ZodType ? z.infer<T> : null;
}

/** Copie les cookies posés par l'API (jetons HttpOnly) sur la réponse du site. */
export async function relaySetCookies(res: Response): Promise<void> {
  const setCookies = res.headers.getSetCookie();
  if (setCookies.length === 0) return;
  const jar = await cookies();
  for (const header of setCookies) {
    const cookie = parseSetCookie(header);
    if (!cookie) continue;
    if (cookie.maxAge === 0 || (cookie.expires && cookie.expires.getTime() <= Date.now())) {
      jar.delete({ name: cookie.name, path: cookie.path });
      continue;
    }
    jar.set({
      name: cookie.name,
      value: cookie.value,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      path: cookie.path,
      maxAge: cookie.maxAge,
      expires: cookie.expires,
    });
  }
}

/** Vrai si l'erreur signifie « connexion requise » (déclenche la feuille de connexion côté client). */
export function isAuthError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}
