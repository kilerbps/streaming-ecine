import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@ecine/contracts';
import { DiscoverFeed } from '@/components/features/feed/discover-feed';
import { pageMetadata } from '@/server/seo';

export async function generateMetadata({ params }: PageProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('meta');
  return {
    ...pageMetadata({
      locale: locale as Locale,
      path: '',
      title: t('defaultTitle'),
      description: t('defaultDescription'),
    }),
    title: { absolute: t('defaultTitle') },
  };
}

/** Accueil : fil de découverte en attendant l'accueil en rangées (lot 3 de la refonte, D-10). */
export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  return <DiscoverFeed locale={locale as Locale} />;
}
