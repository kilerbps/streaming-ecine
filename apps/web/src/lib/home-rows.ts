import {
  HOME_ROW_MIN_TITLES,
  type FilmSummary,
  type HomeRow,
  type PersonalHome,
} from '@ecine/contracts';

/** Au-delà de la 3e rangée, le rendu est différé (`content-visibility`). */
export const EAGER_ROWS = 3;

/** Rangée affichée : celles de l'API, plus « Parce que vous avez regardé {titre} » (personnelle). */
export type ShownRow = HomeRow | { kind: 'because'; title: string; films: FilmSummary[] };

/** Rangées choisies par l'équipe ou calculées pour tous : « Pas pour moi » ne les touche pas. */
const CURATED = new Set<ShownRow['kind']>(['top10', 'editorial']);

/**
 * Applique la partie personnelle (ADR-0014) : titres « Pas pour moi » retirés des rangées
 * automatiques (une rangée sous le seuil disparaît), « Parce que vous avez regardé » placée après
 * Nouveautés (4e rangée de la spécification), rangées par catégorie ordonnées par affinité.
 */
export function applyPersonal(rows: HomeRow[], personal: PersonalHome | null): ShownRow[] {
  if (!personal) return rows;
  const hidden = new Set(personal.hidden);
  const filtered: ShownRow[] = rows
    .map((row) =>
      'films' in row && !CURATED.has(row.kind) && hidden.size > 0
        ? { ...row, films: row.films.filter((film) => !hidden.has(film.id)) }
        : row,
    )
    .filter(
      (row) =>
        !('films' in row) || CURATED.has(row.kind) || row.films.length >= HOME_ROW_MIN_TITLES,
    );

  const because = personal.becauseWatched;
  if (because) {
    const films = because.films.filter((film) => !hidden.has(film.id));
    if (films.length >= HOME_ROW_MIN_TITLES) {
      const after = Math.max(
        filtered.findIndex((row) => row.kind === 'new'),
        filtered.findIndex((row) => row.kind === 'top10'),
      );
      filtered.splice(after + 1, 0, { kind: 'because', title: because.title, films });
    }
  }

  // Rangées par catégorie : même emplacement, ordre selon l'affinité, les autres ensuite.
  const rank = new Map(personal.categoryOrder.map((slug, index) => [slug, index]));
  const categories = filtered.filter((row) => row.kind === 'category');
  const sorted = [...categories].sort(
    (a, b) =>
      (rank.get(a.kind === 'category' ? a.slug : '') ?? Infinity) -
      (rank.get(b.kind === 'category' ? b.slug : '') ?? Infinity),
  );
  let next = 0;
  return filtered.map((row) => (row.kind === 'category' ? sorted[next++]! : row));
}

/**
 * Un même titre n'apparaît pas deux fois dans les trois premières rangées (Reprendre, Top 10,
 * Nouveautés) : Nouveautés cède la place, le Top 10 garde ses rangs.
 */
export function dedupeFirstRows<T extends ShownRow>(rows: T[], continueIds: string[]): T[] {
  const seen = new Set(continueIds);
  const firstRows = Math.max(0, EAGER_ROWS - (continueIds.length > 0 ? 1 : 0));
  return rows
    .map((row, index) => {
      if (index >= firstRows || !('films' in row)) return row;
      const films = row.kind === 'new' ? row.films.filter((film) => !seen.has(film.id)) : row.films;
      for (const film of films) seen.add(film.id);
      return { ...row, films };
    })
    .filter((row) => !('films' in row) || row.films.length > 0);
}
