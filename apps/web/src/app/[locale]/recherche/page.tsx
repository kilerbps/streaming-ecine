import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { CategoryOverview, Locale, PersonSummary, SearchResults } from '@ecine/contracts';
import { ArticleCard } from '@/components/features/content/article-card';
import { FilmTile, TileGrid } from '@/components/features/content/film-tile';
import { CategoryTile } from '@/components/features/search/category-tile';
import { RecentSearches } from '@/components/features/search/recent-searches';
import { SearchBox } from '@/components/features/search/search-box';
import { LargeTitle } from '@/components/layout/header-title';
import { Icon } from '@/components/ui/icon';
import { PillLink } from '@/components/ui/pill';
import { Row } from '@/components/ui/row';
import { Portrait } from '@/components/ui/tiles';
import { routes } from '@/lib/routes';
import { getCategories, getPeople, search } from '@/server/data';

export const metadata: Metadata = { title: 'Rechercher', robots: { index: false, follow: true } };

const SECTION_TITLE = 'mb-3 text-xl leading-[25px] lg:mb-4 lg:text-2xl lg:leading-[30px]';

/**
 * Recherche et exploration. Vide : recherches récentes, catégories en vignettes 16:9, talents et
 * Courts-métrages (c'est par ici qu'ils restent à un toucher sur mobile). Avec une requête : groupes
 * Catégories, Films, Talents, Actualités ; le nombre de résultats est annoncé aux lecteurs d'écran.
 */
export default async function SearchPage({
  params,
  searchParams,
}: PageProps<'/[locale]/recherche'>) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const rawQ = (await searchParams).q;
  const q = typeof rawQ === 'string' ? rawQ.trim().replace(/\s+/g, ' ').slice(0, 80) : '';
  const t = await getTranslations('search');
  const searching = q.length >= 2;
  const results: SearchResults | null = searching ? await search(q, 12).catch(() => null) : null;
  const total = results
    ? results.films.length +
      results.people.length +
      results.articles.length +
      results.categories.length
    : 0;
  // Exploration : à l'état vide, et en secours quand rien ne correspond.
  const explore = !searching || total === 0;
  const [categories, people] = explore
    ? await Promise.all([
        getCategories().catch((): CategoryOverview[] => []),
        getPeople()
          .then((page) => page.items.slice(0, 12))
          .catch((): PersonSummary[] => []),
      ])
    : [[], []];

  return (
    <div className="container-page pt-6 md:pt-10">
      <header className="flex flex-col gap-4">
        <LargeTitle>{t('title')}</LargeTitle>
        <div className="max-w-2xl">
          <SearchBox key={q} locale={locale} initialQuery={q} autoFocus={!q} />
        </div>
      </header>
      <p aria-live="polite" className={q ? 'mt-4 text-[15px] leading-5 text-muted' : 'sr-only'}>
        {!q
          ? ''
          : !searching
            ? t('hint')
            : total === 0
              ? t('noResult', { q })
              : t('results', { count: total })}
      </p>

      {!q ? <RecentSearches locale={locale} /> : null}

      {results && results.categories.length > 0 ? (
        <section className="mt-8" aria-labelledby="r-categories">
          <h2 id="r-categories" className={SECTION_TITLE}>
            {t('categories')}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {results.categories.map((c) => (
              <li key={c.slug}>
                <PillLink href={routes.category(locale, c.slug)}>{c.name}</PillLink>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {results && results.films.length > 0 ? (
        <section className="mt-8 lg:mt-10" aria-labelledby="r-films">
          <h2 id="r-films" className={SECTION_TITLE}>
            {t('films')}
          </h2>
          <TileGrid>
            {results.films.map((film, index) => (
              <FilmTile key={film.id} film={film} locale={locale} eager={index < 3} />
            ))}
          </TileGrid>
        </section>
      ) : null}

      {results && results.people.length > 0 ? (
        <div className="bleed mt-8 lg:mt-10">
          <PeopleRow id="r-talents" title={t('people')} people={results.people} locale={locale} />
        </div>
      ) : null}

      {results && results.articles.length > 0 ? (
        <section className="mt-8 lg:mt-10" aria-labelledby="r-articles">
          <h2 id="r-articles" className={SECTION_TITLE}>
            {t('articles')}
          </h2>
          <ul className="flex flex-col gap-5 md:grid md:grid-cols-2 md:gap-x-6 md:gap-y-8 lg:grid-cols-3">
            {results.articles.map((article) => (
              <li key={article.id}>
                <ArticleCard article={article} locale={locale} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {explore && categories.length > 0 ? (
        <section className="mt-8 lg:mt-10" aria-labelledby="explorer">
          <h2 id="explorer" className={SECTION_TITLE}>
            {t('exploreCategories')}
          </h2>
          <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 lg:grid-cols-4 lg:gap-4">
            {categories.map((category, index) => (
              <li key={category.slug}>
                <CategoryTile
                  category={category}
                  href={routes.category(locale, category.slug)}
                  countLabel={t('titleCount', { count: category.filmCount })}
                  eager={index < 2}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {explore && people.length > 0 ? (
        <div className="bleed mt-8 lg:mt-10">
          <PeopleRow
            id="talents"
            title={t('people')}
            people={people}
            locale={locale}
            seeAll={{ href: routes.people(locale), label: t('seeAllPeople') }}
          />
        </div>
      ) : null}

      {explore ? (
        <nav aria-label={t('browse')} className="mt-8 lg:mt-10">
          <ul className="flex flex-col gap-2 md:flex-row">
            {[
              { href: routes.shorts(locale), label: t('browseShorts'), icon: 'film' as const },
              { href: routes.films(locale), label: t('browseFilms'), icon: 'list' as const },
            ].map((link) => (
              <li key={link.href} className="md:min-w-72">
                <Link
                  transitionTypes={['push']}
                  href={link.href}
                  className="press flex min-h-14 items-center gap-3 rounded-md bg-surface-1 px-4 text-[17px] font-semibold text-text hover:bg-surface-2"
                >
                  <Icon name={link.icon} size={24} className="text-muted" />
                  <span className="flex-1">{link.label}</span>
                  <Icon name="chevronRight" size={20} className="text-subtle" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}

/** Rangée de talents en portraits ronds (rôles traduits, séparés par des virgules). */
async function PeopleRow({
  id,
  title,
  people,
  locale,
  seeAll,
}: {
  id: string;
  title: string;
  people: PersonSummary[];
  locale: Locale;
  seeAll?: { href: string; label: string };
}) {
  const tr = await getTranslations('roles');
  return (
    <Row id={id} title={title} seeAll={seeAll}>
      {people.map((person) => (
        <Portrait
          key={person.id}
          href={routes.person(locale, person.slug)}
          name={person.name}
          role={person.roles.map((r) => tr(r)).join(', ')}
          image={person.photo}
        />
      ))}
    </Row>
  );
}
