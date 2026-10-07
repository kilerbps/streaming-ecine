import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@ecine/contracts';
import { FilmCatalog } from '@/components/features/content/film-catalog';
import { routes } from '@/lib/routes';
import { getCategories, getFilms } from '@/server/data';
import { pageMetadata } from '@/server/seo';

type Props = PageProps<'/[locale]/categories/[slug]'>;

async function findCategory(slug: string) {
  const categories = await getCategories();
  return { categories, category: categories.find((c) => c.slug === slug) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const { category } = await findCategory(slug);
  if (!category) return {};
  const t = await getTranslations('film');
  return pageMetadata({
    locale: locale as Locale,
    path: `/categories/${slug}`,
    title: `${category.name} — ${t('listTitle')}`,
    description: `${category.name} : ${t('listIntro')}`,
  });
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const cursor = (await searchParams).apres;
  const { categories, category } = await findCategory(slug);
  if (!category) notFound();
  const t = await getTranslations('film');
  const page = await getFilms({
    category: slug,
    cursor: typeof cursor === 'string' ? cursor : undefined,
  });
  return (
    <FilmCatalog
      locale={locale as Locale}
      title={category.name}
      intro={t('listIntro')}
      page={page}
      categories={categories}
      activeCategory={slug}
      basePath={routes.category(locale as Locale, slug)}
      categoryHref={(s) => routes.category(locale as Locale, s)}
    />
  );
}
