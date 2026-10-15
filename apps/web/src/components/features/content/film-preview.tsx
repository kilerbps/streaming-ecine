import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { FilmDetail, FilmSummary, Locale, ViewerState } from '@ecine/contracts';
import { BookmarkButton } from '@/components/features/interactions/bookmark-button';
import { LikeButton } from '@/components/features/interactions/like-button';
import { ShareButton } from '@/components/features/interactions/share-button';
import { ExpandableText } from '@/components/ui/expandable-text';
import { Icon } from '@/components/ui/icon';
import { MediaImage } from '@/components/ui/media-image';
import { Tag } from '@/components/ui/tag';
import { Portrait } from '@/components/ui/tiles';
import { formatDate, formatRuntime } from '@/lib/format';
import { routes } from '@/lib/routes';
import { FilmTile } from './film-tile';
import { DataUseLine, PreviewWatchButton } from './film-preview-client';

/** Défilement horizontal dans la feuille (distribution, « Vous aimerez aussi »). */
const SHEET_SCROLLER = 'no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:-mx-6 md:px-6';

/**
 * Contenu de l'aperçu rapide (docs/design/04, Aperçu rapide) : image 16:9, informations, langues,
 * bouton unique Regarder ou Reprendre (placé avant le synopsis pour rester visible quand la feuille
 * est à 60 %), synopsis sur trois lignes, actions, consommation de données, lien vers la fiche ; en
 * dépliant la feuille, la distribution et « Vous aimerez aussi ».
 */
export async function FilmPreview({
  film,
  state,
  related,
  locale,
}: {
  film: FilmDetail;
  state: ViewerState | null;
  related: FilmSummary[];
  locale: Locale;
}) {
  const [t, tl, tr, tt] = await Promise.all([
    getTranslations('film'),
    getTranslations('languages'),
    getTranslations('roles'),
    getTranslations('tiles'),
  ]);
  const href = routes.film(locale, film.slug);
  const upcoming = film.releaseAt !== null && new Date(film.releaseAt) > new Date();
  const facts = [film.year, formatRuntime(film.runtimeSec), film.categories[0]?.name].filter(
    Boolean,
  );
  const languages = [
    film.audioLanguages.map((l) => tl(l)).join(', '),
    film.subtitleLanguages.length > 0
      ? t('subtitlesLine', { languages: film.subtitleLanguages.map((l) => tl(l)).join(', ') })
      : null,
  ].filter(Boolean);
  const cast = film.credits.filter((c) => c.role === 'ACTOR');

  return (
    <div className="flex flex-col gap-4">
      <MediaImage
        image={film.poster}
        ratio="16/9"
        sizes="(min-width: 672px) 592px, 100vw"
        preload
        className="rounded-lg"
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] leading-5 text-muted">
        {facts.map((fact) => (
          <span key={String(fact)}>{fact}</span>
        ))}
        {film.ageRating ? <Tag>{film.ageRating}</Tag> : null}
      </div>
      {languages.length > 0 ? (
        <p className="-mt-2 text-[15px] leading-5 text-muted">{languages.join(' · ')}</p>
      ) : null}
      {film.videoId ? (
        <PreviewWatchButton
          filmId={film.id}
          href={`${href}?reprendre=1`}
          serverPosition={state?.positionSec ?? null}
          runtimeSec={film.runtimeSec}
        />
      ) : (
        <p className="text-[15px] leading-5">
          {upcoming && film.releaseAt
            ? `${tt('soon')} · ${t('releaseOn', { date: formatDate(film.releaseAt) })}`
            : t('noVideo')}
        </p>
      )}
      {film.synopsis ? (
        <ExpandableText moreLabel={t('more')} lines={3} className="text-[15px] leading-[22px]">
          {film.synopsis}
        </ExpandableText>
      ) : null}
      <div className="flex gap-3">
        <BookmarkButton filmId={film.id} initial={state?.bookmarked ?? false} variant="action" />
        <LikeButton
          targetType="FILM"
          targetId={film.id}
          initialLiked={state?.liked ?? false}
          initialCount={film.likeCount}
          variant="action"
        />
        <ShareButton title={film.title} path={href} variant="action" />
      </div>
      {film.videoId ? <DataUseLine /> : null}
      <Link
        transitionTypes={['push']}
        href={href}
        className="press -mx-1 flex min-h-11 items-center justify-between gap-3 rounded-md px-1 text-[17px] font-semibold"
      >
        {t('fullPage')}
        <Icon name="chevronRight" size={20} className="text-subtle" />
      </Link>

      {cast.length > 0 ? (
        <section aria-labelledby="apercu-avec" className="mt-2 flex flex-col gap-3">
          <h2 id="apercu-avec" className="text-xl leading-[25px]">
            {t('castRow')}
          </h2>
          <div className={SHEET_SCROLLER}>
            {cast.map((credit) => (
              <Portrait
                key={`${credit.person.slug}-${credit.character ?? ''}`}
                href={routes.person(locale, credit.person.slug)}
                name={credit.person.name}
                role={credit.character ?? tr(credit.role)}
                image={credit.person.photo}
              />
            ))}
          </div>
        </section>
      ) : null}
      {related.length > 0 ? (
        <section aria-labelledby="apercu-similaires" className="mt-2 flex flex-col gap-3">
          <h2 id="apercu-similaires" className="text-xl leading-[25px]">
            {t('related')}
          </h2>
          <div className={`tile-size ${SHEET_SCROLLER}`}>
            {related.map((f) => (
              <FilmTile key={f.id} film={f} locale={locale} layout="row" />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
