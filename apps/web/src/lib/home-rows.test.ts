import { describe, expect, it } from 'vitest';
import type { FilmSummary, HomeRow } from '@ecine/contracts';
import { dedupeFirstRows } from './home-rows';

const f = (id: string) => ({ id }) as FilmSummary;
const top10: HomeRow = { kind: 'top10', films: [f('a'), f('b')] };
const fresh: HomeRow = { kind: 'new', films: [f('a'), f('c'), f('d')] };
const shorts: HomeRow = { kind: 'shorts', films: [f('a')] };

describe('dedupeFirstRows', () => {
  it('retire de Nouveautés les titres déjà dans Reprendre ou le Top 10', () => {
    const rows = dedupeFirstRows([top10, fresh], ['d']);
    expect(rows[1]).toEqual({ kind: 'new', films: [f('c')] });
  });

  it('garde les rangs du Top 10 et ne touche pas aux rangées suivantes', () => {
    const rows = dedupeFirstRows([top10, fresh, shorts], ['a']);
    expect(rows[0]).toEqual(top10);
    expect(rows[2]).toEqual(shorts);
  });

  it('masque une rangée Nouveautés devenue vide', () => {
    const rows = dedupeFirstRows([top10, { kind: 'new', films: [f('a'), f('b')] }], []);
    expect(rows.map((r) => r.kind)).toEqual(['top10']);
  });
});
