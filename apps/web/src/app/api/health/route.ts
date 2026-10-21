/** Santé du site pour Caddy et Docker (ADR-0016) : répond sans appeler l'API ni la base. */
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
}
