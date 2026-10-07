import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Category, FilmSummary, Locale, Page } from '@ecine/contracts';
import { EmptyState } from '@/components/ui/empty-state';
import { LinkButton } from '@/components/ui/link-button';
import { FilmTile, TileGrid } from './film-tile';

/**
 * Catalogue : en-tête éditorial, filtres par catégorie (liens, pas de JavaScript requis),
 * grille de tuiles et pagination « Voir plus » par curseur rendue côté serveur.
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
  const t = await getTranslations('film');
  const tc = await getTranslations('common');
  return (
    <div className="container-page pt-8 md:pt-12">
      <header className="mb-8 grid gap-3 md:mb-12 md:grid-cols-[1fr_auto] md:items-end">
        <h1 className="font-serif text-4xl md:text-6xl">{title}</h1>
        <p className="max-w-sm text-muted md:text-right">{intro}</p>
      </header>
      {categories.length > 0 ? (
        <nav
          aria-label="Catégories"
          className="no-scrollbar -mx-4 mb-10 overflow-x-auto px-4 md:mx-0 md:px-0"
        >
          <ul className="flex gap-2">
            <li>
              <CategoryLink href={basePath} active={!activeCategory} label={t('allCategories')} />
            </li>
            {categories.map((c) => (
              <li key={c.slug}>
                <CategoryLink
                  href={categoryHref(c.slug)}
                  active={activeCategory === c.slug}
                  label={c.name}
                />
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
            <FilmTile key={film.id} film={film} locale={locale} eager={index < 2} />
          ))}
        </TileGrid>
      )}
      {page.nextCursor ? (
        <div className="mt-12 flex justify-center">
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

function CategoryLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`eyebrow inline-flex min-h-11 items-center whitespace-nowrap border px-4 ${
        active
          ? 'border-accent bg-accent text-accent-text'
          : 'border-border-strong text-text hover:bg-surface-2'
      }`}
    >
      {label}
    </Link>
  );
}
