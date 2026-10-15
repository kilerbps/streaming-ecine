import type { HomeRow } from '@ecine/contracts';

/** Au-delà de la 3e rangée, le rendu est différé (`content-visibility`). */
export const EAGER_ROWS = 3;

/**
 * Un même titre n'apparaît pas deux fois dans les trois premières rangées (Reprendre, Top 10,
 * Nouveautés) : Nouveautés cède la place, le Top 10 garde ses rangs.
 */
export function dedupeFirstRows(rows: HomeRow[], continueIds: string[]): HomeRow[] {
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
