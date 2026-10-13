import { isFilmLanguage, playableWhere, visibleWhere } from './content.helpers.js';

describe('playableWhere', () => {
  it('exige un film visible et déjà sorti (ou sans date de sortie)', () => {
    const now = new Date('2026-10-13T12:00:00Z');
    expect(playableWhere(now)).toEqual({
      ...visibleWhere(now),
      OR: [{ releaseAt: null }, { releaseAt: { lte: now } }],
    });
  });
});

describe('isFilmLanguage', () => {
  it('reconnaît les langues des films et ignore les codes inconnus', () => {
    expect(['ln', 'fr', 'lua', 'xx', ''].filter(isFilmLanguage)).toEqual(['ln', 'fr', 'lua']);
  });
});
