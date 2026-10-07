import { getTranslations } from 'next-intl/server';
import { getFilm } from '@/server/data';
import { filmMeta } from '@/lib/format';
import { ogCard, ogContentType, ogSize } from '@/server/og';

export const size = ogSize;
export const contentType = ogContentType;
export const alt = 'Film sur E-Ciné';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [film, t] = await Promise.all([getFilm(slug), getTranslations('kinds')]);
  return ogCard({
    eyebrow: t(film.kind),
    title: film.title,
    meta: [filmMeta(film.year, film.runtimeSec), ...film.categories.map((c) => c.name)]
      .filter(Boolean)
      .join(' · '),
  });
}
