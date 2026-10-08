import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { CreditRole, FilmDetail, Locale } from '@ecine/contracts';
import { FilmTile, TileGrid } from '@/components/features/content/film-tile';
import { Poster } from '@/components/features/content/poster';
import { BookmarkButton } from '@/components/features/interactions/bookmark-button';
import { LikeButton } from '@/components/features/interactions/like-button';
import { ReportButton } from '@/components/features/interactions/report-button';
import { ShareButton } from '@/components/features/interactions/share-button';
import { Player } from '@/components/features/player/player';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { JsonLd } from '@/components/seo/json-ld';
import { Tag } from '@/components/ui/tag';
import { formatRuntime } from '@/lib/format';
import { routes } from '@/lib/routes';
import { getFilm, getFilms, getFilmViewerState } from '@/server/data';
import { loadOrNotFound } from '@/server/not-found';
import { absoluteUrl, ogImage, pageMetadata } from '@/server/seo';

type Props = PageProps<'/[locale]/films/[slug]'>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const film = await loadOrNotFound(() => getFilm(slug), `/${locale}/films/${slug}`);
  return pageMetadata({
    locale: locale as Locale,
    path: `/films/${film.slug}`,
    title: film.seo.title ?? film.title,
    description: film.seo.description ?? film.synopsis,
    image: film.poster,
    noIndex: film.seo.noIndex,
    type: 'video.movie',
  });
}

const CAST: CreditRole[] = ['ACTOR'];

function movieJsonLd(film: FilmDetail, locale: Locale) {
  const people = (role: CreditRole) =>
    film.credits
      .filter((c) => c.role === role)
      .map((c) => ({
        '@type': 'Person',
        name: c.person.name,
        url: absoluteUrl(routes.person(locale, c.person.slug)),
      }));
  // Jamais l'URL du flux protégé (contentUrl) : seule la fiche publique est décrite.
  return {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: film.title,
    description: film.synopsis,
    url: absoluteUrl(routes.film(locale, film.slug)),
    image: ogImage(film.poster),
    datePublished: film.publishedAt ?? undefined,
    dateCreated: film.year ? String(film.year) : undefined,
    duration: film.runtimeSec ? `PT${Math.round(film.runtimeSec / 60)}M` : undefined,
    genre: film.categories.map((c) => c.name),
    director: people('DIRECTOR'),
    actor: people('ACTOR'),
    producer: people('PRODUCER'),
    inLanguage: 'fr',
  };
}

export default async function FilmPage({ params, searchParams }: Props) {
  const { locale: rawLocale, slug } = await params;
  const locale = rawLocale as Locale;
  const resume = (await searchParams).reprendre === '1';
  const film = await loadOrNotFound(() => getFilm(slug), `/${locale}/films/${slug}`);
  const [t, tk, tr, state, related] = await Promise.all([
    getTranslations('film'),
    getTranslations('kinds'),
    getTranslations('roles'),
    getFilmViewerState(film.id),
    film.categories[0]
      ? getFilms({ category: film.categories[0].slug, limit: 6 }).catch(() => null)
      : Promise.resolve(null),
  ]);
  const cast = film.credits.filter((c) => CAST.includes(c.role));
  const crew = film.credits.filter((c) => !CAST.includes(c.role));
  const meta = [film.year, formatRuntime(film.runtimeSec), film.ageRating]
    .filter(Boolean)
    .join(' · ');
  const others = (related?.items ?? []).filter((f) => f.id !== film.id).slice(0, 5);

  return (
    <article className="pb-12">
      <div className="mx-auto max-w-6xl md:px-8 md:pt-8">
        {film.videoId ? (
          <Player
            filmId={film.id}
            videoId={film.videoId}
            title={film.title}
            poster={film.poster}
            serverPosition={state?.positionSec ?? null}
            runtimeSec={film.runtimeSec}
            locale={locale}
            autoStart={resume}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
            <Poster image={film.poster} sizes="(min-width: 672px) 33vw, 100vw" preload />
            <p className="self-end border-l-2 border-signal px-4 text-muted">{t('noVideo')}</p>
          </div>
        )}
      </div>

      <div className="container-page mt-8 max-w-6xl md:mt-12">
        <Breadcrumbs
          items={[
            {
              label: t('listTitle'),
              href: film.kind === 'SHORT' ? routes.shorts(locale) : routes.films(locale),
            },
            { label: film.title, href: routes.film(locale, film.slug) },
          ]}
        />
        <div className="grid gap-10 lg:grid-cols-[7fr_5fr] lg:gap-16">
          <div>
            <div className="flex flex-wrap gap-2">
              <Tag tone="highlight">{tk(film.kind)}</Tag>
              {film.categories.map((c) => (
                <Link
                  key={c.slug}
                  href={routes.category(locale, c.slug)}
                  className="eyebrow border border-border px-2 py-0.5 text-muted hover:text-text"
                >
                  {c.name}
                </Link>
              ))}
            </div>
            <h1 className="mt-4 font-serif text-4xl md:text-6xl">{film.title}</h1>
            {film.originalTitle && film.originalTitle !== film.title ? (
              <p className="mt-2 font-serif italic text-muted">
                {t('originalTitle')} : {film.originalTitle}
              </p>
            ) : null}
            <p className="meta mt-4">{meta}</p>
            <div className="-ml-2 mt-4 flex items-center gap-1">
              <LikeButton
                targetType="FILM"
                targetId={film.id}
                initialLiked={state?.liked ?? false}
                initialCount={film.likeCount}
              />
              <BookmarkButton filmId={film.id} initial={state?.bookmarked ?? false} withLabel />
              <ShareButton title={film.title} path={routes.film(locale, film.slug)} />
              <ReportButton targetType="FILM" targetId={film.id} />
            </div>
            <section aria-labelledby="resume" className="mt-8">
              <h2 id="resume" className="eyebrow text-muted">
                {t('synopsis')}
              </h2>
              <p className="mt-3 max-w-prose whitespace-pre-line text-lg leading-relaxed">
                {film.synopsis}
              </p>
            </section>
            {film.trailerUrl ? (
              <p className="mt-6">
                <a
                  href={film.trailerUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="text-accent-text underline underline-offset-4"
                >
                  {t('trailer')}
                </a>
              </p>
            ) : null}
          </div>

          <aside className="flex flex-col gap-10">
            {cast.length > 0 ? (
              <CreditList
                title={t('cast')}
                credits={cast}
                locale={locale}
                roleLabel={(c) => (c.character ? t('as', { character: c.character }) : tr(c.role))}
              />
            ) : null}
            {crew.length > 0 ? (
              <CreditList
                title={t('crew')}
                credits={crew}
                locale={locale}
                roleLabel={(c) => tr(c.role)}
              />
            ) : null}
          </aside>
        </div>

        {others.length > 0 ? (
          <section aria-labelledby="similaires" className="mt-20">
            <h2 id="similaires" className="mb-6 font-serif text-2xl">
              {t('related')}
            </h2>
            <TileGrid>
              {others.map((f) => (
                <FilmTile key={f.id} film={f} locale={locale} />
              ))}
            </TileGrid>
          </section>
        ) : null}
      </div>
      <JsonLd data={movieJsonLd(film, locale)} />
    </article>
  );
}

function CreditList({
  title,
  credits,
  locale,
  roleLabel,
}: {
  title: string;
  credits: FilmDetail['credits'];
  locale: Locale;
  roleLabel: (credit: FilmDetail['credits'][number]) => string;
}) {
  return (
    <section>
      <h2 className="eyebrow mb-3 text-muted">{title}</h2>
      <ul className="divide-y divide-border border-y border-border">
        {credits.map((credit) => (
          <li key={`${credit.person.slug}-${credit.role}-${credit.character ?? ''}`}>
            <Link
              href={routes.person(locale, credit.person.slug)}
              className="flex min-h-14 items-center gap-4 py-2 hover:bg-surface-1"
            >
              <div className="w-11 shrink-0">
                <Poster image={credit.person.photo} ratio="1/1" sizes="44px" />
              </div>
              <div>
                <p className="font-medium">{credit.person.name}</p>
                <p className="text-sm text-muted">{roleLabel(credit)}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
