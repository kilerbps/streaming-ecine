import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Locale, SearchResults } from '@ecine/contracts';
import { FilmTile, TileGrid } from '@/components/features/content/film-tile';
import { Poster } from '@/components/features/content/poster';
import { SearchBox } from '@/components/features/search/search-box';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';
import { search } from '@/server/data';
import { LargeTitle } from '@/components/layout/header-title';

export const metadata: Metadata = { title: 'Rechercher', robots: { index: false, follow: true } };

export default async function SearchPage({
  params,
  searchParams,
}: PageProps<'/[locale]/recherche'>) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const rawQ = (await searchParams).q;
  const q = typeof rawQ === 'string' ? rawQ.trim().slice(0, 80) : '';
  const [t, tr] = await Promise.all([getTranslations('search'), getTranslations('roles')]);
  let results: SearchResults | null = null;
  if (q.length >= 2) results = await search(q, 12).catch(() => null);
  const total = results
    ? results.films.length +
      results.people.length +
      results.articles.length +
      results.categories.length
    : 0;

  return (
    <div className="container-page pt-8 md:pt-12">
      <LargeTitle>{t('title')}</LargeTitle>
      <div className="mt-6 max-w-2xl">
        <SearchBox locale={locale} initialQuery={q} autoFocus={!q} />
        <p className="mt-3 text-sm text-muted" aria-live="polite">
          {q.length < 2
            ? t('hint')
            : total === 0
              ? t('noResult', { q })
              : t('results', { count: total })}
        </p>
      </div>

      {results && results.categories.length > 0 ? (
        <section className="mt-10" aria-labelledby="r-categories">
          <h2 id="r-categories" className="eyebrow mb-3 text-muted">
            {t('categories')}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {results.categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={routes.category(locale, c.slug)}
                  className="eyebrow inline-flex min-h-11 items-center border border-border-strong px-4 hover:bg-surface-2"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {results && results.films.length > 0 ? (
        <section className="mt-12" aria-labelledby="r-films">
          <h2 id="r-films" className="mb-6 font-serif text-2xl">
            {t('films')}
          </h2>
          <TileGrid>
            {results.films.map((film) => (
              <FilmTile key={film.id} film={film} locale={locale} />
            ))}
          </TileGrid>
        </section>
      ) : null}

      {results && results.people.length > 0 ? (
        <section className="mt-12" aria-labelledby="r-people">
          <h2 id="r-people" className="mb-6 font-serif text-2xl">
            {t('people')}
          </h2>
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {results.people.map((p) => (
              <li key={p.id}>
                <Link
                  href={routes.person(locale, p.slug)}
                  className="flex items-center gap-4 border border-border p-3 hover:bg-surface-1"
                >
                  <div className="w-16 shrink-0">
                    <Poster image={p.photo} ratio="1/1" sizes="64px" />
                  </div>
                  <div>
                    <p className="font-serif text-lg">{p.name}</p>
                    <p className="meta">{p.roles.map((r) => tr(r)).join(' · ')}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {results && results.articles.length > 0 ? (
        <section className="mt-12" aria-labelledby="r-articles">
          <h2 id="r-articles" className="mb-6 font-serif text-2xl">
            {t('articles')}
          </h2>
          <ul className="divide-y divide-border border-y border-border">
            {results.articles.map((a) => (
              <li key={a.id}>
                <Link
                  href={routes.article(locale, a.slug)}
                  className="block py-4 hover:bg-surface-1"
                >
                  <p className="meta">{formatDate(a.publishedAt)}</p>
                  <p className="font-serif text-xl">{a.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
