import { describe, expect, it, vi } from 'vitest';
import type { HomeRow } from '@ecine/contracts';
import { FilmMapper } from './film.mapper.js';
import { HOME_RULES, HomeService, orderHomeRows } from './home.service.js';

const film = (id: string) => ({ kind: 'new', films: [{ id }] }) as unknown as HomeRow;

describe('orderHomeRows', () => {
  it("suit l'ordre de la spécification et ignore les rangées absentes", () => {
    const rows = orderHomeRows({
      top10: { kind: 'top10', films: [] },
      fresh: null,
      shorts: { kind: 'shorts', films: [] },
      soon: null,
      talents: { kind: 'talents', people: [] },
      editorial: [{ kind: 'editorial', id: 'e', title: 'Spécial', films: [] }],
      categories: [{ kind: 'category', slug: 'drame', name: 'Drame', films: [] }],
    });
    expect(rows.map((r) => r.kind)).toEqual([
      'top10',
      'shorts',
      'talents',
      'editorial',
      'category',
    ]);
  });

  it('garde 11 rangées au plus (Reprendre, ajoutée par le site, fait la 12e)', () => {
    const categories = Array.from({ length: 20 }, (_, i) => film(String(i)));
    expect(
      orderHomeRows({
        top10: null,
        fresh: null,
        shorts: null,
        soon: null,
        talents: null,
        editorial: [],
        categories,
      }),
    ).toHaveLength(HOME_RULES.rowsMax);
  });
});

/** Prisma simulé : chaque requête de film renvoie `count` films factices. */
function serviceWith(count: number, slots: Array<{ film: number; previewVideo: boolean }> = []) {
  const films = Array.from({ length: count }, (_, i) => ({
    id: `f${i}`,
    slug: `film-${i}`,
    kind: 'FEATURE',
    originalTitle: null,
    year: 2026,
    runtimeSec: 600,
    publishAt: new Date('2026-10-01T00:00:00Z'),
    releaseAt: null,
    translations: [{ locale: 'fr', title: `Film ${i}`, tagline: null }],
    poster: null,
    titleImage: null,
    audioLanguages: ['ln'],
    videos: [{ id: `v${i}` }],
    // Le film 1 n'a pas encore d'aperçu généré.
    previewFile: i === 1 ? null : `f${i}-abc.mp4`,
    categories: [],
  }));
  const prisma = {
    film: { findMany: vi.fn().mockResolvedValue(films) },
    featuredSlot: {
      findMany: vi
        .fn()
        .mockResolvedValue(
          slots.map((s) => ({ film: films[s.film], previewVideo: s.previewVideo })),
        ),
    },
    topTenEntry: { findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn() },
    homeTalent: { findMany: vi.fn().mockResolvedValue([]) },
    homeRow: { findMany: vi.fn().mockResolvedValue([]) },
    category: { findMany: vi.fn().mockResolvedValue([]) },
  };
  const cache = { wrap: (_ns: string, _key: string, _ttl: number, fn: () => unknown) => fn() };
  const media = {
    image: () => null,
    preview: (file: string | null) => (file ? `https://media.test/previews/${file}` : null),
  };
  return new HomeService(
    prisma as never,
    cache as never,
    new FilmMapper(media as never),
    media as never,
  );
}

describe('HomeService', () => {
  it('masque les rangées sous leur seuil (4 titres)', async () => {
    const home = await serviceWith(3).home('fr');
    expect(home.rows.map((r) => r.kind)).toEqual(['soon']);
    expect(home.featured).toHaveLength(3);
  });

  it('affiche Nouveautés et Courts-métrages dès 4 titres', async () => {
    const home = await serviceWith(4).home('fr');
    expect(home.rows.map((r) => r.kind)).toEqual(['new', 'shorts', 'soon']);
  });

  it('garde 5 films à la une au plus', async () => {
    expect((await serviceWith(8).home('fr')).featured).toHaveLength(5);
  });

  it("n'affiche que les films lisibles comme « Regarder » à la une", async () => {
    const home = await serviceWith(1).home('fr');
    expect(home.featured[0]).toMatchObject({ playable: true, audioLanguages: ['ln'] });
  });

  it("ne donne l'aperçu qu'aux emplacements programmés qui le demandent, s'il est généré", async () => {
    const home = await serviceWith(4, [
      { film: 2, previewVideo: true },
      { film: 3, previewVideo: false },
      { film: 1, previewVideo: true },
    ]).home('fr');
    expect(home.featured.map((f) => [f.film.id, f.previewUrl])).toEqual([
      ['f2', 'https://media.test/previews/f2-abc.mp4'],
      ['f3', null],
      ['f1', null],
      ['f0', null],
    ]);
  });
});
