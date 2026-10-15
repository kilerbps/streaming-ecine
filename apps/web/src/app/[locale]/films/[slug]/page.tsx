import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { CreditRole, FilmDetail, Locale } from '@ecine/contracts';
import { FilmStage } from '@/components/features/content/film-stage';
import { FilmTile } from '@/components/features/content/film-tile';
import { BookmarkButton } from '@/components/features/interactions/bookmark-button';
import { LikeButton } from '@/components/features/interactions/like-button';
import { ReportButton } from '@/components/features/interactions/report-button';
import { ShareButton } from '@/components/features/interactions/share-button';
import { HeroTitle } from '@/components/layout/header-title';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { JsonLd } from '@/components/seo/json-ld';
import { Badge } from '@/components/ui/badge';
import { ExpandableText } from '@/components/ui/expandable-text';
import { ActionLink } from '@/components/ui/icon-button';
import { MediaImage } from '@/components/ui/media-image';
import { Row } from '@/components/ui/row';
import { Tag } from '@/components/ui/tag';
import { Portrait } from '@/components/ui/tiles';
import { formatDate, formatRuntime } from '@/lib/format';
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
/** « Vous aimerez aussi » : 10 titres de la même catégorie. */
const RELATED_COUNT = 10;

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
    inLanguage: film.audioLanguages[0] ?? 'fr',
  };
}

/** Équipe regroupée par rôle, dans l'ordre du générique. */
function crewByRole(credits: FilmDetail['credits']) {
  const groups = new Map<CreditRole, FilmDetail['credits']>();
  for (const credit of credits) {
    groups.set(credit.role, [...(groups.get(credit.role) ?? []), credit]);
  }
  return [...groups.entries()];
}

/**
 * Fiche film (docs/design/04, Fiche film) : scène immersive et bouton unique Regarder / Reprendre,
 * rangée d'actions (Ma liste, J'aime, Bande-annonce, Partager), synopsis, langues et lieu de
 * tournage, distribution en portraits, « Vous aimerez aussi », puis les détails et Signaler.
 */
export default async function FilmPage({ params, searchParams }: Props) {
  const { locale: rawLocale, slug } = await params;
  const locale = rawLocale as Locale;
  const resume = (await searchParams).reprendre === '1';
  const film = await loadOrNotFound(() => getFilm(slug), `/${locale}/films/${slug}`);
  const [t, tr, tl, tt, state, related] = await Promise.all([
    getTranslations('film'),
    getTranslations('roles'),
    getTranslations('languages'),
    getTranslations('tiles'),
    getFilmViewerState(film.id),
    film.categories[0]
      ? getFilms({ category: film.categories[0].slug, limit: RELATED_COUNT + 1 }).catch(() => null)
      : Promise.resolve(null),
  ]);
  const cast = film.credits.filter((c) => CAST.includes(c.role));
  const crew = crewByRole(film.credits.filter((c) => !CAST.includes(c.role)));
  const others = (related?.items ?? []).filter((f) => f.id !== film.id).slice(0, RELATED_COUNT);
  const upcoming = film.releaseAt !== null && new Date(film.releaseAt) > new Date();
  const facts = [film.year, formatRuntime(film.runtimeSec), film.categories[0]?.name].filter(
    Boolean,
  );
  const languages = [
    film.audioLanguages.length > 0
      ? t('audio', { languages: film.audioLanguages.map((l) => tl(l)).join(', ') })
      : null,
    film.subtitleLanguages.length > 0
      ? t('subtitlesLine', { languages: film.subtitleLanguages.map((l) => tl(l)).join(', ') })
      : null,
    film.filmingLocation ? t('filmedIn', { place: film.filmingLocation }) : null,
  ].filter(Boolean);
  const listHref = film.kind === 'SHORT' ? routes.shorts(locale) : routes.films(locale);

  return (
    <article className="pb-12">
      <FilmStage
        player={
          film.videoId
            ? {
                filmId: film.id,
                videoId: film.videoId,
                title: film.title,
                poster: film.poster,
                serverPosition: state?.positionSec ?? null,
                runtimeSec: film.runtimeSec,
                locale,
                autoStart: resume,
                audioLanguages: film.audioLanguages,
              }
            : null
        }
        image={
          <MediaImage
            image={film.poster}
            ratio={null}
            crop={{ base: '4:5', lg: '16:9' }}
            sizes="100vw"
            preload
            className="aspect-[4/5] [view-transition-name:film-poster] md:aspect-video lg:max-h-[80dvh]"
          />
        }
        fallback={
          upcoming && film.releaseAt ? (
            <p className="flex flex-wrap items-center gap-2 text-[15px] leading-5">
              <Badge tone="accent">{tt('soon')}</Badge>
              {t('releaseOn', { date: formatDate(film.releaseAt) })}
            </p>
          ) : (
            <p className="text-[15px] leading-5 text-muted">{t('noVideo')}</p>
          )
        }
      >
        <HeroTitle
          title={film.title}
          className="font-display text-[34px] font-extrabold leading-[38px] tracking-[-0.02em] text-balance lg:text-[56px] lg:leading-[60px]"
        >
          {film.titleImage ? (
            <>
              <span className="sr-only">{film.title}</span>
              <MediaImage
                image={{ ...film.titleImage, alt: '' }}
                ratio="3/2"
                sizes="(min-width: 1056px) 30vw, 60vw"
                className="max-w-[60%] bg-transparent lg:max-w-[70%]"
                imageClassName="object-contain object-left-bottom"
              />
            </>
          ) : (
            film.title
          )}
        </HeroTitle>
        {film.tagline ? (
          <p className="text-[15px] leading-5 text-muted lg:text-[17px] lg:leading-[22px]">
            {film.tagline}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] leading-5 text-muted">
          {facts.map((fact) => (
            <span key={String(fact)}>{fact}</span>
          ))}
          {film.ageRating ? <Tag>{film.ageRating}</Tag> : null}
        </div>
      </FilmStage>

      {/* Mobile : une colonne (actions, synopsis, Avec, Vous aimerez aussi, Détails). PC : les détails
          passent à droite du synopsis, les rangées gardent toute la largeur. */}
      <div className="container-page mt-5 grid gap-y-8 lg:mt-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-x-16 lg:gap-y-10">
        <div className="flex flex-col gap-6 lg:col-start-1 lg:row-start-1">
          <div className="hidden lg:block [&_nav]:mb-0">
            <Breadcrumbs
              items={[
                {
                  label: film.kind === 'SHORT' ? t('shortsTitle') : t('listTitle'),
                  href: listHref,
                },
                { label: film.title, href: routes.film(locale, film.slug) },
              ]}
            />
          </div>
          <div className="flex gap-3 md:gap-5">
            <BookmarkButton
              filmId={film.id}
              initial={state?.bookmarked ?? false}
              variant="action"
            />
            <LikeButton
              targetType="FILM"
              targetId={film.id}
              initialLiked={state?.liked ?? false}
              initialCount={film.likeCount}
              variant="action"
            />
            {film.trailerUrl ? (
              <ActionLink
                href={film.trailerUrl}
                rel="noopener noreferrer"
                target="_blank"
                icon="play"
                label={t('trailer')}
              >
                <span className="sr-only">{t('newTab')}</span>
              </ActionLink>
            ) : null}
            <ShareButton
              title={film.title}
              path={routes.film(locale, film.slug)}
              variant="action"
            />
          </div>
          {film.synopsis ? (
            <section aria-label={t('synopsis')} className="max-w-[68ch]">
              <ExpandableText
                moreLabel={t('more')}
                className="text-[15px] leading-[22px] md:text-[17px] md:leading-[26px]"
              >
                {film.synopsis}
              </ExpandableText>
            </section>
          ) : null}
          {languages.length > 0 ? (
            <p className="max-w-[68ch] text-[15px] leading-5 text-muted">{languages.join(' · ')}</p>
          ) : null}
        </div>

        {cast.length > 0 ? (
          <div className="bleed lg:col-span-2">
            <Row id="avec" title={t('castRow')}>
              {cast.map((credit) => (
                <Portrait
                  key={`${credit.person.slug}-${credit.character ?? ''}`}
                  href={routes.person(locale, credit.person.slug)}
                  name={credit.person.name}
                  role={credit.character ?? tr(credit.role)}
                  image={credit.person.photo}
                />
              ))}
            </Row>
          </div>
        ) : null}

        {others.length > 0 ? (
          <div className="bleed lg:col-span-2">
            <Row id="similaires" title={t('related')}>
              {others.map((f) => (
                <FilmTile key={f.id} film={f} locale={locale} layout="row" />
              ))}
            </Row>
          </div>
        ) : null}

        <section aria-labelledby="details" className="mt-2 lg:col-start-2 lg:row-start-1 lg:mt-0">
          <h2 id="details" className="text-xl leading-[25px] lg:text-[17px] lg:leading-[22px]">
            {t('details')}
          </h2>
          <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-[15px] leading-5">
            {film.originalTitle && film.originalTitle !== film.title ? (
              <>
                <dt className="text-muted">{t('originalTitle')}</dt>
                <dd>{film.originalTitle}</dd>
              </>
            ) : null}
            {crew.map(([role, credits]) => (
              <div key={role} className="contents">
                <dt className="text-muted">{tr(role)}</dt>
                <dd>
                  {credits.map((credit, index) => (
                    <span key={credit.person.slug}>
                      {index > 0 ? ', ' : null}
                      <Link
                        href={routes.person(locale, credit.person.slug)}
                        className="underline-offset-4 hover:underline"
                      >
                        {credit.person.name}
                      </Link>
                    </span>
                  ))}
                </dd>
              </div>
            ))}
            {film.categories.length > 0 ? (
              <>
                <dt className="text-muted">{t('categoriesLabel')}</dt>
                <dd>
                  {film.categories.map((category, index) => (
                    <span key={category.slug}>
                      {index > 0 ? ', ' : null}
                      <Link
                        href={routes.category(locale, category.slug)}
                        className="underline-offset-4 hover:underline"
                      >
                        {category.name}
                      </Link>
                    </span>
                  ))}
                </dd>
              </>
            ) : null}
          </dl>
          <div className="-ml-2 mt-4">
            <ReportButton targetType="FILM" targetId={film.id} withLabel />
          </div>
        </section>
      </div>
      <JsonLd data={movieJsonLd(film, locale)} />
    </article>
  );
}
