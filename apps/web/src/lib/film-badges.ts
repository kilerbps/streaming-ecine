import type { FilmSummary } from '@ecine/contracts';

export type FilmBadge = 'soon' | 'new' | 'short';

/** « Nouveau » pendant 30 jours après la mise en ligne (docs/design/04-ecrans-publics.md). */
const NEW_FOR_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Badges d'une tuile, deux au plus (charte, Badge) : « Bientôt » pour un film annoncé, sinon
 * « Nouveau » pendant 30 jours ; « Court-métrage » ensuite.
 */
export function filmBadges(
  film: Pick<FilmSummary, 'kind' | 'publishedAt' | 'releaseAt'>,
  now: Date,
): FilmBadge[] {
  const badges: FilmBadge[] = [];
  const release = film.releaseAt ? Date.parse(film.releaseAt) : NaN;
  const published = film.publishedAt ? Date.parse(film.publishedAt) : NaN;
  if (release > now.getTime()) badges.push('soon');
  else if (now.getTime() - published < NEW_FOR_MS) badges.push('new');
  if (film.kind === 'SHORT') badges.push('short');
  return badges.slice(0, 2);
}
