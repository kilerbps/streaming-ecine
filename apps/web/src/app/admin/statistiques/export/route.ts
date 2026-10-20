import { cookies, headers } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { statsQuerySchema } from '@ecine/contracts';
import { serverConfig } from '@/server/config';
import { authCookieNames } from '@/server/cookie-names';
import { relayHeaders, visitorIp } from '@/server/relay';

/**
 * Export CSV des statistiques (ADMIN, vérifié par l'API) : relais serveur du fichier produit par
 * `GET /admin/stats/export.csv`, avec les cookies du visiteur. `privateRequest` ne lit que du JSON,
 * d'où cet appel direct (mêmes en-têtes : relais signé de l'IP et de l'agent réels, cookies d'authentification).
 */
export async function GET(request: NextRequest) {
  const parsed = statsQuerySchema.safeParse({
    days: request.nextUrl.searchParams.get('days') ?? undefined,
  });
  if (!parsed.success)
    return new NextResponse('Période invalide : 7, 30 ou 90 jours.', { status: 400 });

  const config = serverConfig();
  const [jar, h] = await Promise.all([cookies(), headers()]);
  const names = authCookieNames(config.COOKIE_SECURE);
  const auth = [names.access, names.refresh]
    .map((name) => jar.get(name))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
    .join('; ');
  const target = new URL('/v1/admin/stats/export.csv', config.API_INTERNAL_URL);
  target.searchParams.set('days', String(parsed.data.days));
  const forwarded: Record<string, string> = {
    accept: 'text/csv',
    ...relayHeaders(config.SERVICE_API_KEY, 'GET', target.toString(), {
      ip: visitorIp(h),
      userAgent: h.get('user-agent'),
    }),
  };
  if (auth) forwarded.cookie = auth;
  let res: Response;
  try {
    res = await fetch(target, {
      headers: forwarded,
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return new NextResponse(
      'Le serveur de statistiques ne répond pas. Réessayez dans un instant.',
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  if (!res.ok) {
    const message =
      res.status === 401
        ? 'Connexion requise.'
        : res.status === 403
          ? 'Export réservé aux administrateurs (double authentification requise).'
          : 'Export impossible.';
    return new NextResponse(message, {
      status: res.status,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
  return new NextResponse(await res.text(), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="e-cine-statistiques-${parsed.data.days}j.csv"`,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
