import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@ecine/contracts';
import { DiscoverFeed } from '@/components/features/feed/discover-feed';
import { pageMetadata } from '@/server/seo';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/decouvrir'>): Promise<Metadata> {
  const { locale } = await params;
  const [nav, feed] = await Promise.all([getTranslations('nav'), getTranslations('feed')]);
  return pageMetadata({
    locale: locale as Locale,
    path: '/decouvrir',
    title: nav('discover'),
    description: feed('intro'),
  });
}

/**
 * Onglet Découvrir : le fil de découverte actuel, en attendant le fil vertical d'extraits en plein
 * écran (lot 4 de la refonte, docs/design/04-ecrans-publics.md).
 */
export default async function DiscoverPage({ params }: PageProps<'/[locale]/decouvrir'>) {
  const { locale } = await params;
  return <DiscoverFeed locale={locale as Locale} />;
}
