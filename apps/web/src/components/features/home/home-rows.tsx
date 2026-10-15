import { getTranslations } from 'next-intl/server';
import type { ContinueWatchingItem, FilmSummary, HomeRow, Locale } from '@ecine/contracts';
import { ContinueWatching } from '@/components/features/content/continue-watching';
import { FilmTile } from '@/components/features/content/film-tile';
import { Row } from '@/components/ui/row';
import { RowTracker } from './row-tracker';
import { LandscapeTile, Portrait, Top10Tile } from '@/components/ui/tiles';
import { formatRuntime } from '@/lib/format';
import { dedupeFirstRows, EAGER_ROWS } from '@/lib/home-rows';
import { routes } from '@/lib/routes';

/** Nom stable d'une rangée pour la mesure (`home_row_*`), en minuscules sans accent. */
function rowId(row: HomeRow): string {
  switch (row.kind) {
    case 'top10':
      return 'top10';
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

/** Rangées de l'accueil, dans l'ordre calculé par l'API ; Reprendre en tête pour un membre. */
export async function HomeRows({
  rows,
  continueWatching,
  locale,
}: {
  rows: HomeRow[];
  continueWatching: ContinueWatchingItem[];
  locale: Locale;
}) {
  const [t, tc] = await Promise.all([getTranslations('home'), getTranslations('common')]);
  const shown = dedupeFirstRows(
    rows,
    continueWatching.map((item) => item.film.id),
  );
  const offset = continueWatching.length > 0 ? 1 : 0;
  const seeAll = (href: string, title: string) => ({ href, label: `${tc('seeAll')} : ${title}` });
  const posters = (films: FilmSummary[]) =>
    films.map((film) => (
      <FilmTile key={film.id} film={film} locale={locale} layout="row" preview />
    ));

  return (
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
                  {row.films.map((film, rank) => (
                    <Top10Tile
                      key={film.id}
                      rank={rank + 1}
                      href={routes.filmPreview(locale, film.slug)}
                      title={film.title}
                      ariaLabel={t('top10Label', { rank: rank + 1, title: film.title })}
                      image={film.poster}
                    />
                  ))}
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
                  {row.films.map((film) => (
                    <LandscapeTile
                      key={film.id}
                      href={routes.filmPreview(locale, film.slug)}
                      title={film.title}
                      image={film.poster}
                      meta={formatRuntime(film.runtimeSec) ?? undefined}
                    />
                  ))}
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
                <Row key={row.id} id={`selection-${row.id}`} title={row.title} deferred={deferred}>
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
  );
}
