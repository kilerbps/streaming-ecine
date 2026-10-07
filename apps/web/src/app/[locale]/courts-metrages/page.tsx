import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@ecine/contracts';
import { FilmCatalog } from '@/components/features/content/film-catalog';
import { routes } from '@/lib/routes';
import { getFilms } from '@/server/data';
import { pageMetadata } from '@/server/seo';

type Props = PageProps<'/[locale]/courts-metrages'>;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('film');
  const paged = Boolean((await searchParams).apres);
  return pageMetadata({
    locale: locale as Locale,
    path: '/courts-metrages',
    title: t('shortsTitle'),
    description: t('shortsIntro'),
    noIndex: paged,
  });
}

export default async function ShortsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const cursor = (await searchParams).apres;
  const t = await getTranslations('film');
  const page = await getFilms({
    kind: 'SHORT',
    cursor: typeof cursor === 'string' ? cursor : undefined,
  });
  return (
    <FilmCatalog
      locale={locale as Locale}
      title={t('shortsTitle')}
      intro={t('shortsIntro')}
      page={page}
      categories={[]}
      basePath={routes.shorts(locale as Locale)}
      categoryHref={(slug) => routes.category(locale as Locale, slug)}
    />
  );
}
