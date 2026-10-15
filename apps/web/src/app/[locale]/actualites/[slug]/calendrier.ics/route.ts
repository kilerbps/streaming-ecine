import type { NextRequest } from 'next/server';
import type { Locale } from '@ecine/contracts';
import { toIcs } from '@/lib/ics';
import { routes } from '@/lib/routes';
import { getArticle } from '@/server/data';
import { absoluteUrl } from '@/server/seo';

/** Durée par défaut d'un événement : les actualités n'ont pas encore d'heure de fin. */
const EVENT_DURATION_MS = 2 * 60 * 60 * 1000;

/** « Ajouter au calendrier » : fichier .ics d'un événement (Nouveautés → Événements). */
export async function GET(
  _request: NextRequest,
  context: RouteContext<'/[locale]/actualites/[slug]/calendrier.ics'>,
) {
  const { locale, slug } = await context.params;
  const article = await getArticle(slug).catch(() => null);
  if (!article || article.kind !== 'EVENT' || !article.eventStart) {
    return new Response('Événement introuvable.', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }
  const start = new Date(article.eventStart);
  const url = absoluteUrl(routes.article(locale as Locale, article.slug));
  const body = toIcs({
    uid: `${article.id}@e-cine`,
    start,
    end: new Date(start.getTime() + EVENT_DURATION_MS),
    title: article.title,
    location: article.eventPlace,
    description: [article.excerpt, url].filter(Boolean).join('\n\n'),
    url,
  });
  return new Response(body, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': `attachment; filename="${article.slug}.ics"`,
      'cache-control': 'private, max-age=300',
    },
  });
}
