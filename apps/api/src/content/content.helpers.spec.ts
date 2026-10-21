import type { Env } from '../config/env.js';
import { isFilmLanguage, MediaUrls, playableWhere, visibleWhere } from './content.helpers.js';

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

describe('MediaUrls.image', () => {
  const media = { id: 'm1', alt: 'Affiche', width: 1000, height: 1500, decorative: false };

  it('sert les images sous MEDIA_PUBLIC_URL/images par défaut', () => {
    const urls = new MediaUrls({ MEDIA_PUBLIC_URL: 'http://localhost:4000/media' } as Env);
    expect(urls.image(media)?.src).toBe('http://localhost:4000/media/images/m1');
  });

  it('sert les images sous IMAGES_PUBLIC_URL quand elle est définie (adresse du site)', () => {
    const urls = new MediaUrls({
      MEDIA_PUBLIC_URL: 'https://media.ecine.art',
      IMAGES_PUBLIC_URL: 'https://ecine.art/images',
    } as Env);
    expect(urls.image(media)?.src).toBe('https://ecine.art/images/m1');
  });
});
