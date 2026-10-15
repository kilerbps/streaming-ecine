import { describe, expect, it } from 'vitest';
import { REVALIDATE_TAG } from './revalidate-tags';

/** Étiquettes émises par l'API (src/revalidate/content-events.service.ts) : toutes doivent passer. */
const API_TAGS = [
  'films',
  'film:le-fleuve-en-silence',
  'people',
  'person:grace-mbuyi',
  'articles',
  'article:projection-plein-air-mama-kiese',
  'feed',
  'pages',
  'page:a-propos',
  'team',
  'settings',
  'categories',
  'sitemap',
  'home',
  'whats-new',
];

describe('REVALIDATE_TAG', () => {
  it('accepte toutes les étiquettes émises par l’API', () => {
    for (const tag of API_TAGS) expect(tag).toMatch(REVALIDATE_TAG);
  });

  it('refuse les formes inattendues', () => {
    for (const tag of [
      '',
      'Films',
      'films:',
      '-home',
      'home-',
      'film:Le Film',
      'a/b',
      'home:x:y',
    ]) {
      expect(tag).not.toMatch(REVALIDATE_TAG);
    }
  });
});
