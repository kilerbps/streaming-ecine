import { getTranslations } from 'next-intl/server';
import { getPerson } from '@/server/data';
import { ogCard, ogContentType, ogSize } from '@/server/og';

export const size = ogSize;
export const contentType = ogContentType;
export const alt = 'Talent sur E-Ciné';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [person, t] = await Promise.all([getPerson(slug), getTranslations('roles')]);
  return ogCard({
    eyebrow: person.roles.map((r) => t(r)).join(' · ') || 'Talent',
    title: person.name,
    meta: `${person.filmography.length} film(s)`,
  });
}
