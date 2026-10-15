import { getTranslations } from 'next-intl/server';
import { filmMeta } from '@/lib/format';
import { serverConfig } from '@/server/config';
import { getFilm } from '@/server/data';
import { ogContentType, ogFilmCard, ogSize } from '@/server/og';

export const size = ogSize;
export const contentType = ogContentType;
export const alt = 'Film sur E-Ciné';

/** Affiche JPEG préparée par l'API (le moteur des images de partage ne lit pas le WebP). */
async function posterDataUrl(slug: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${serverConfig().API_INTERNAL_URL}/v1/share-images/films/${encodeURIComponent(slug)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    return `data:image/jpeg;base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [film, t, tf, poster] = await Promise.all([
    getFilm(slug),
    getTranslations('kinds'),
    getTranslations('film'),
    posterDataUrl(slug),
  ]);
  return ogFilmCard({
    poster,
    eyebrow: t(film.kind),
    title: film.title,
    tagline: film.tagline,
    meta: [filmMeta(film.year, film.runtimeSec), film.categories[0]?.name]
      .filter(Boolean)
      .join(' · '),
    cta: tf('shareCta'),
  });
}
