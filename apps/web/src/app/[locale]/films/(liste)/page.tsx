import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@ecine/contracts';
import { FilmCatalog } from '@/components/features/content/film-catalog';
import { routes } from '@/lib/routes';
import { getCategories, getFilms } from '@/server/data';
import { pageMetadata } from '@/server/seo';

type Props = PageProps<'/[locale]/films'>;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('film');
  const paged = Boolean((await searchParams).apres);
  return pageMetadata({
    locale: locale as Locale,
    path: '/films',
    title: t('listTitle'),
    description: t('listIntro'),
    noIndex: paged,
  });
}

export default async function FilmsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const cursor = (await searchParams).apres;
  const t = await getTranslations('film');
  const [page, categories] = await Promise.all([
    getFilms({ cursor: typeof cursor === 'string' ? cursor : undefined }),
    getCategories().catch(() => []),
  ]);
  return (
    <FilmCatalog
      locale={locale as Locale}
      title={t('listTitle')}
      intro={t('listIntro')}
      page={page}
      categories={categories}
      basePath={routes.films(locale as Locale)}
      categoryHref={(slug) => routes.category(locale as Locale, slug)}
    />
  );
}
