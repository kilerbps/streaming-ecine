import { describe, expect, it } from 'vitest';
import { filmBadges } from './film-badges';

const now = new Date('2026-10-13T12:00:00Z');
const film = (over: Partial<Parameters<typeof filmBadges>[0]>) => ({
  kind: 'FEATURE' as const,
  publishedAt: '2025-01-01T00:00:00Z',
  releaseAt: null,
  ...over,
});

describe('filmBadges', () => {
  it('ne met aucun badge sur un film ancien', () => {
    expect(filmBadges(film({}), now)).toEqual([]);
  });

  it('marque « Nouveau » pendant 30 jours après la mise en ligne', () => {
    expect(filmBadges(film({ publishedAt: '2026-10-01T00:00:00Z' }), now)).toEqual(['new']);
    expect(filmBadges(film({ publishedAt: '2026-09-01T00:00:00Z' }), now)).toEqual([]);
  });

  it('préfère « Bientôt » à « Nouveau » pour un film annoncé', () => {
    expect(
      filmBadges(
        film({ publishedAt: '2026-10-10T00:00:00Z', releaseAt: '2026-11-01T00:00:00Z' }),
        now,
      ),
    ).toEqual(['soon']);
  });

  it('ajoute « Court-métrage » en second, jamais plus de deux badges', () => {
    expect(filmBadges(film({ kind: 'SHORT', publishedAt: '2026-10-10T00:00:00Z' }), now)).toEqual([
      'new',
      'short',
    ]);
    expect(filmBadges(film({ kind: 'SHORT' }), now)).toEqual(['short']);
  });
});
