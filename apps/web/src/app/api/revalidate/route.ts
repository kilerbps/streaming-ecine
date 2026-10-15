import { createHmac, timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { REVALIDATE_TAG } from '@/lib/revalidate-tags';
import { serverConfig } from '@/server/config';

const MAX_SKEW_MS = 5 * 60 * 1000;
const bodySchema = z.object({
  tags: z.array(z.string().regex(REVALIDATE_TAG).max(160)).min(1).max(100),
});

/**
 * Webhook de revalidation appelé par l'API après une écriture d'administration.
 * Signature HMAC-SHA256 de « horodatage.corps » + fenêtre de 5 min (anti-rejeu, OWASP A08).
 */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  const timestamp = request.headers.get('x-ecine-timestamp') ?? '';
  const signature = request.headers.get('x-ecine-signature') ?? '';
  const age = Math.abs(Date.now() - Number(timestamp));
  if (!timestamp || !Number.isFinite(age) || age > MAX_SKEW_MS) {
    return NextResponse.json({ title: 'Requête expirée' }, { status: 401 });
  }
  const expected = `sha256=${createHmac('sha256', serverConfig().REVALIDATE_SECRET).update(`${timestamp}.${raw}`).digest('hex')}`;
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ title: 'Signature invalide' }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(JSON.parse(raw || '{}'));
  if (!parsed.success) return NextResponse.json({ title: 'Requête invalide' }, { status: 400 });
  // Expiration immédiate : l'administrateur voit sa publication tout de suite.
  for (const tag of parsed.data.tags) revalidateTag(tag, { expire: 0 });
  return NextResponse.json({ revalidated: parsed.data.tags.length });
}
