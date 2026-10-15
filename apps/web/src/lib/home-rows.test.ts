import { describe, expect, it } from 'vitest';
import type { FilmSummary, HomeRow } from '@ecine/contracts';
import { applyPersonal, dedupeFirstRows } from './home-rows';

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

describe('applyPersonal', () => {
  const films = (...ids: string[]) => ids.map(f);
  const rows: HomeRow[] = [
    { kind: 'top10', films: films('a', 'b') },
    { kind: 'new', films: films('a', 'c', 'd', 'e', 'g') },
    { kind: 'category', slug: 'drame', name: 'Drame', films: films('c', 'd', 'e', 'g') },
    { kind: 'category', slug: 'musique', name: 'Musique', films: films('h', 'i', 'j', 'k') },
  ];

  it('retire « Pas pour moi » des rangées automatiques, jamais du Top 10', () => {
    const shown = applyPersonal(rows, { becauseWatched: null, categoryOrder: [], hidden: ['a'] });
    expect(shown[0]).toEqual(rows[0]);
    expect(shown[1]).toMatchObject({ kind: 'new', films: films('c', 'd', 'e', 'g') });
  });

  it('masque une rangée passée sous le seuil de 4 titres', () => {
    const shown = applyPersonal(rows, { becauseWatched: null, categoryOrder: [], hidden: ['c'] });
    expect(shown.map((r) => r.kind)).toEqual(['top10', 'new', 'category']);
  });

  it('place « Parce que vous avez regardé » après Nouveautés', () => {
    const shown = applyPersonal(rows, {
      becauseWatched: { title: 'Le Fleuve', films: films('p', 'q', 'r', 's') },
      categoryOrder: [],
      hidden: [],
    });
    expect(shown.map((r) => r.kind)).toEqual(['top10', 'new', 'because', 'category', 'category']);
  });

  it('ordonne les rangées par catégorie selon l’affinité', () => {
    const shown = applyPersonal(rows, {
      becauseWatched: null,
      categoryOrder: ['musique'],
      hidden: [],
    });
    expect(
      shown.filter((r) => r.kind === 'category').map((r) => r.kind === 'category' && r.slug),
    ).toEqual(['musique', 'drame']);
  });
});
