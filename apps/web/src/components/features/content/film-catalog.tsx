import { getTranslations } from 'next-intl/server';
import type { Category, FilmSummary, Locale, Page } from '@ecine/contracts';
import { LargeTitle } from '@/components/layout/header-title';
import { EmptyState } from '@/components/ui/empty-state';
import { LinkButton } from '@/components/ui/link-button';
import { PillLink } from '@/components/ui/pill';
import { FilmTile, TileGrid } from './film-tile';

/**
 * Catalogue (Films, Courts-métrages, catégorie) : grand titre, pastilles de catégories (liens, sans
 * JavaScript), grille d'affiches 3 / 4 / 6–7 colonnes et « Voir plus » par curseur rendu côté serveur.
 */
export async function FilmCatalog({
  locale,
  title,
  intro,
  page,
  categories,
  activeCategory,
  basePath,
  categoryHref,
}: {
  locale: Locale;
  title: string;
  intro: string;
  page: Page<FilmSummary>;
  categories: Category[];
  activeCategory?: string;
  basePath: string;
  categoryHref: (slug: string) => string;
}) {
  const [t, tc] = await Promise.all([getTranslations('film'), getTranslations('common')]);
  return (
    <div className="container-page pt-6 md:pt-10">
      <header className="mb-5 flex flex-col gap-2 md:mb-6">
        <LargeTitle>{title}</LargeTitle>
        <p className="max-w-[60ch] text-[15px] leading-5 text-muted md:text-base md:leading-6">
          {intro}
        </p>
      </header>
      {categories.length > 0 ? (
        <nav aria-label={t('categoriesNav')} className="-mx-4 mb-6 md:-mx-8 lg:mx-0 lg:mb-8">
          <ul className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1 md:px-8 lg:flex-wrap lg:px-0">
            <li>
              <PillLink href={basePath} selected={!activeCategory}>
                {t('allCategories')}
              </PillLink>
            </li>
            {categories.map((c) => (
              <li key={c.slug}>
                <PillLink href={categoryHref(c.slug)} selected={activeCategory === c.slug}>
                  {c.name}
                </PillLink>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      {page.items.length === 0 ? (
        <EmptyState title={t('emptyList')} />
      ) : (
        <TileGrid>
          {page.items.map((film, index) => (
            <FilmTile key={film.id} film={film} locale={locale} eager={index < 3} />
          ))}
        </TileGrid>
      )}
      {page.nextCursor ? (
        <div className="mt-10 flex justify-center">
          <LinkButton
            href={`${basePath}?apres=${encodeURIComponent(page.nextCursor)}`}
            variant="secondary"
            rel="next"
          >
            {tc('seeMore')}
          </LinkButton>
        </div>
      ) : null}
    </div>
  );
}
