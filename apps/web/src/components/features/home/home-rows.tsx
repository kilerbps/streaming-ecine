import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import type { ContinueWatchingItem, FilmSummary, Locale } from '@ecine/contracts';
import { ContinueWatching } from '@/components/features/content/continue-watching';
import { FilmTile } from '@/components/features/content/film-tile';
import { Row } from '@/components/ui/row';
import { RowTracker } from './row-tracker';
import { HomeMenuProvider, TileMenu } from './tile-menu';
import { LandscapeTile, Portrait, Top10Tile } from '@/components/ui/tiles';
import { formatRuntime } from '@/lib/format';
import { dedupeFirstRows, EAGER_ROWS, type ShownRow } from '@/lib/home-rows';
import { routes } from '@/lib/routes';

/** Nom stable d'une rangée pour la mesure (`home_row_*`), en minuscules sans accent. */
function rowId(row: ShownRow): string {
  switch (row.kind) {
    case 'top10':
      return 'top10';
    case 'because':
      return 'parce-que';
    case 'new':
      return 'nouveautes';
    case 'shorts':
      return 'courts';
    case 'soon':
      return 'bientot';
    case 'talents':
      return 'talents';
    case 'editorial':
      return `selection-${row.id}`;
    case 'category':
      return `categorie-${row.slug}`;
  }
}

/**
 * Rangées de l'accueil, dans l'ordre calculé par l'API puis personnalisé ; Reprendre en tête pour un
 * membre. Chaque affiche porte le menu contextuel (Ma liste, Partager, Pas pour moi, Voir la fiche).
 */
export async function HomeRows({
  rows,
  continueWatching,
  locale,
  canDismiss,
  bookmarkedIds,
}: {
  rows: ShownRow[];
  continueWatching: ContinueWatchingItem[];
  locale: Locale;
  canDismiss: boolean;
  bookmarkedIds: string[];
}) {
  const [t, tc] = await Promise.all([getTranslations('home'), getTranslations('common')]);
  const shown = dedupeFirstRows(
    rows,
    continueWatching.map((item) => item.film.id),
  );
  const offset = continueWatching.length > 0 ? 1 : 0;
  const seeAll = (href: string, title: string) => ({ href, label: `${tc('seeAll')} : ${title}` });
  /** Tuile avec son menu contextuel (la tuile reste le déclencheur : aucun élément ajouté). */
  const withMenu = (film: FilmSummary, tile: ReactNode) => (
    <TileMenu key={film.id} film={film} href={routes.filmPreview(locale, film.slug)}>
      {tile}
    </TileMenu>
  );
  const posters = (films: FilmSummary[]) =>
    films.map((film) =>
      withMenu(film, <FilmTile film={film} locale={locale} layout="row" preview />),
    );

  return (
    <HomeMenuProvider canDismiss={canDismiss} bookmarkedIds={bookmarkedIds}>
      <div className="flex flex-col gap-8 lg:gap-10">
        {continueWatching.length > 0 ? (
          <RowTracker row="reprendre">
            <ContinueWatching items={continueWatching} locale={locale} />
          </RowTracker>
        ) : null}
        {shown.map((row, index) => {
          const deferred = index + offset >= EAGER_ROWS;
          const id = rowId(row);
          const node = (() => {
            switch (row.kind) {
              case 'top10':
                return (
                  <Row key="top10" id="top10" title={t('rows.top10')} deferred={deferred}>
                    {row.films.map((film, rank) =>
                      withMenu(
                        film,
                        <Top10Tile
                          rank={rank + 1}
                          href={routes.filmPreview(locale, film.slug)}
                          title={film.title}
                          ariaLabel={t('top10Label', { rank: rank + 1, title: film.title })}
                          image={film.poster}
                        />,
                      ),
                    )}
                  </Row>
                );
              case 'because':
                return (
                  <Row
                    key="because"
                    id="parce-que"
                    title={t('rows.because', { title: row.title })}
                    deferred={deferred}
                  >
                    {posters(row.films)}
                  </Row>
                );
              case 'new':
                return (
                  <Row
                    key="new"
                    id="nouveautes"
                    title={t('rows.new')}
                    seeAll={seeAll(routes.films(locale), t('rows.new'))}
                    deferred={deferred}
                  >
                    {posters(row.films)}
                  </Row>
                );
              case 'shorts':
                return (
                  <Row
                    key="shorts"
                    id="courts"
                    title={t('rows.shorts')}
                    seeAll={seeAll(routes.shorts(locale), t('rows.shorts'))}
                    deferred={deferred}
                  >
                    {row.films.map((film) =>
                      withMenu(
                        film,
                        <LandscapeTile
                          href={routes.filmPreview(locale, film.slug)}
                          title={film.title}
                          image={film.poster}
                          meta={formatRuntime(film.runtimeSec) ?? undefined}
                        />,
                      ),
                    )}
                  </Row>
                );
              case 'soon':
                return (
                  <Row
                    key="soon"
                    id="bientot"
                    title={t('rows.soon')}
                    seeAll={seeAll(routes.whatsNew(locale), t('rows.soon'))}
                    deferred={deferred}
                  >
                    {posters(row.films)}
                  </Row>
                );
              case 'talents':
                return (
                  <Row
                    key="talents"
                    id="talents"
                    title={t('rows.talents')}
                    seeAll={seeAll(routes.people(locale), t('rows.talents'))}
                    deferred={deferred}
                  >
                    {row.people.map((person) => (
                      <Portrait
                        key={person.id}
                        href={routes.person(locale, person.slug)}
                        name={person.name}
                        image={person.photo}
                      />
                    ))}
                  </Row>
                );
              case 'editorial':
                return (
                  <Row
                    key={row.id}
                    id={`selection-${row.id}`}
                    title={row.title}
                    deferred={deferred}
                  >
                    {posters(row.films)}
                  </Row>
                );
              case 'category':
                return (
                  <Row
                    key={row.slug}
                    id={`categorie-${row.slug}`}
                    title={row.name}
                    seeAll={seeAll(routes.category(locale, row.slug), row.name)}
                    deferred={deferred}
                  >
                    {posters(row.films)}
                  </Row>
                );
            }
          })();
          return (
            <RowTracker key={id} row={id}>
              {node}
            </RowTracker>
          );
        })}
      </div>
    </HomeMenuProvider>
  );
}
