import { describe, expect, it, vi } from 'vitest';
import type { ArticleDetail, FilmDetail, PersonDetail } from '@ecine/contracts';

vi.mock('./config', () => ({ serverConfig: () => ({ SITE_URL: 'https://ecine.art' }) }));

const { articleJsonLd, isoDuration, itemListJsonLd, movieJsonLd, profileJsonLd, siteGraph } =
  await import('./structured-data');

const image = {
  src: 'https://media.ecine.art/images/abc',
  alt: 'Affiche',
  width: 1000,
  height: 1500,
  color: null,
  blur: null,
  focal: null,
  crops: null,
};

const film: FilmDetail = {
  id: 'f1',
  slug: 'kin-la-nuit',
  kind: 'FEATURE',
  title: 'Kin la nuit',
  year: 2026,
  runtimeSec: 5820,
  poster: image,
  categories: [{ slug: 'drame', name: 'Drame' }],
  publishedAt: '2026-10-01T10:00:00.000Z',
  releaseAt: null,
  originalTitle: null,
  synopsis: 'Une nuit à Kinshasa.',
  tagline: null,
  ageRating: '12+',
  audioLanguages: ['ln', 'fr'],
  subtitleLanguages: ['fr'],
  filmingLocation: null,
  titleImage: null,
  creditsStartSec: null,
  availableUntil: null,
  trailerUrl: null,
  videoId: 'v1',
  previewUrl: null,
  credits: [
    {
      role: 'DIRECTOR',
      character: null,
      person: { slug: 'a-b', name: 'A B', photo: null },
    },
  ],
  seo: { title: null, description: null, noIndex: false },
  updatedAt: '2026-10-20T10:00:00.000Z',
  likeCount: 0,
};

describe('isoDuration', () => {
  it('écrit la durée en ISO 8601', () => {
    expect(isoDuration(5820)).toBe('PT1H37M');
    expect(isoDuration(3600)).toBe('PT1H');
    expect(isoDuration(600)).toBe('PT10M');
    expect(isoDuration(null)).toBeUndefined();
  });
});

describe('movieJsonLd', () => {
  it('décrit la fiche sans jamais exposer de flux vidéo', () => {
    const data = movieJsonLd(film, 'fr');
    expect(data).toMatchObject({
      '@type': 'Movie',
      '@id': 'https://ecine.art/fr/films/kin-la-nuit#film',
      name: 'Kin la nuit',
      duration: 'PT1H37M',
      contentRating: '12+',
      inLanguage: 'ln',
      subtitleLanguage: ['fr'],
      dateModified: '2026-10-20T10:00:00.000Z',
      image: 'https://media.ecine.art/images/abc/w1280.webp',
      director: [{ '@type': 'Person', name: 'A B', url: 'https://ecine.art/fr/personnes/a-b' }],
      provider: { '@id': 'https://ecine.art/#organisation' },
    });
    expect(JSON.stringify(data)).not.toMatch(/contentUrl|embedUrl|\.m3u8/);
  });

  it('omet les champs vides (aucun tableau vide, aucun undefined)', () => {
    const data = movieJsonLd({ ...film, credits: [], ageRating: null }, 'fr');
    expect(data).not.toHaveProperty('actor');
    expect(data).not.toHaveProperty('director');
    expect(data).not.toHaveProperty('contentRating');
    expect(Object.values(data)).not.toContain(undefined);
  });
});

describe('profileJsonLd', () => {
  it('page de profil dont la personne est l’entité principale', () => {
    const person: PersonDetail = {
      id: 'p1',
      slug: 'a-b',
      name: 'A B',
      photo: null,
      roles: ['DIRECTOR'],
      bio: '',
      birthYear: null,
      socials: { instagram: 'https://instagram.com/ab' },
      filmography: [],
      updatedAt: '2026-10-20T10:00:00.000Z',
    };
    expect(profileJsonLd(person, 'fr', ['Réalisation'])).toEqual({
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      url: 'https://ecine.art/fr/personnes/a-b',
      dateModified: '2026-10-20T10:00:00.000Z',
      mainEntity: {
        '@type': 'Person',
        '@id': 'https://ecine.art/fr/personnes/a-b#personne',
        name: 'A B',
        url: 'https://ecine.art/fr/personnes/a-b',
        jobTitle: ['Réalisation'],
        sameAs: ['https://instagram.com/ab'],
      },
    });
  });
});

describe('articleJsonLd', () => {
  const article: ArticleDetail = {
    id: 'a1',
    slug: 'festival',
    kind: 'EVENT',
    title: 'Festival',
    excerpt: 'Projection en plein air.',
    cover: null,
    publishedAt: '2026-10-01T10:00:00.000Z',
    eventStart: '2026-11-02T18:00:00.000Z',
    eventPlace: 'Institut français, Kinshasa',
    body: '',
    author: { name: 'Rédaction' },
    featuredFilm: null,
    seo: { title: null, description: null },
    updatedAt: '2026-10-02T10:00:00.000Z',
  };

  it('événement daté et situé : Event complet', () => {
    expect(articleJsonLd(article, 'fr')).toMatchObject({
      '@type': 'Event',
      startDate: '2026-11-02T18:00:00.000Z',
      eventStatus: 'https://schema.org/EventScheduled',
      location: { '@type': 'Place', name: 'Institut français, Kinshasa' },
    });
  });

  it('événement sans date ou sans lieu : NewsArticle (Google refuse un Event incomplet)', () => {
    const data = articleJsonLd({ ...article, eventStart: null }, 'fr');
    expect(data).toMatchObject({
      '@type': 'NewsArticle',
      headline: 'Festival',
      publisher: { '@id': 'https://ecine.art/#organisation' },
      mainEntityOfPage: 'https://ecine.art/fr/actualites/festival',
    });
  });
});

describe('itemListJsonLd et siteGraph', () => {
  it('liste vide : aucune donnée structurée', () => {
    expect(itemListJsonLd('Films', [])).toBeNull();
  });

  it('positions et URL absolues', () => {
    expect(itemListJsonLd('Films', ['/fr/films/a', '/fr/films/b'])).toMatchObject({
      '@type': 'ItemList',
      numberOfItems: 2,
      itemListElement: [
        { position: 1, url: 'https://ecine.art/fr/films/a' },
        { position: 2, url: 'https://ecine.art/fr/films/b' },
      ],
    });
  });

  it('logo PNG carré et réseaux renseignés seulement', () => {
    const graph = siteGraph('fr', { socials: { facebook: 'https://facebook.com/ecine' } });
    const [organization] = graph['@graph'] as Array<Record<string, unknown>>;
    expect(organization).toMatchObject({
      logo: { url: 'https://ecine.art/icons/icon-512.png', width: 512, height: 512 },
      sameAs: ['https://facebook.com/ecine'],
    });
  });
});
