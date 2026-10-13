import { describe, expect, it } from 'vitest';
import { parseSetCookie } from '@/server/set-cookie';
import { filmMeta, formatRuntime, formatTimecode, parseTimecode, truncate } from './format';
import ecineImageLoader from './image-loader';
import { parseBlocks } from './markdown';
import { routes, safeInternalPath } from './routes';

describe('safeInternalPath (anti open-redirect)', () => {
  it.each([
    ['/fr/moi', '/fr/moi'],
    ['/admin/films', '/admin/films'],
  ])('accepte %s', (input, expected) => {
    expect(safeInternalPath(input, '/fr')).toBe(expected);
  });
  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    '',
    null,
    undefined,
  ])('refuse %s', (input) => {
    expect(safeInternalPath(input, '/fr')).toBe('/fr');
  });
});

describe('parseSetCookie', () => {
  it('lit les attributs d’un cookie de session', () => {
    const c = parseSetCookie(
      '__Host-ecine_at=abc.def; Max-Age=900; Path=/; Expires=Fri, 02 Oct 2026 08:19:29 GMT; HttpOnly; Secure; SameSite=Lax',
    );
    expect(c).toMatchObject({
      name: '__Host-ecine_at',
      value: 'abc.def',
      maxAge: 900,
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    });
  });
  it('reconnaît un cookie effacé', () => {
    expect(
      parseSetCookie(
        'ecine_rt=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      )?.expires?.getTime(),
    ).toBe(0);
  });
  it('rejette une ligne invalide', () => {
    expect(parseSetCookie('sans-egal')).toBeNull();
  });
});

describe('formats', () => {
  it('formate les durées', () => {
    expect(formatRuntime(5820)).toBe('1 h 37');
    expect(formatRuntime(840)).toBe('14 min');
    expect(formatRuntime(3600)).toBe('1 h');
    expect(formatRuntime(null)).toBeNull();
  });
  it('formate les timecodes', () => {
    expect(formatTimecode(75)).toBe('1:15');
    expect(formatTimecode(3725)).toBe('1:02:05');
  });

  it('lit un horodatage saisi en administration', () => {
    expect(parseTimecode('1:32:10')).toBe(5530);
    expect(parseTimecode('88:40')).toBe(5320);
    expect(parseTimecode(' 90 ')).toBe(5400);
    expect(parseTimecode('')).toBeUndefined();
    expect(parseTimecode('1:2:3:4')).toBeUndefined();
    expect(parseTimecode('dix')).toBeUndefined();
    expect(parseTimecode('0:00')).toBeUndefined();
  });
  it('compose la ligne de métadonnées', () => {
    expect(filmMeta(2026, 840)).toBe('2026 · 14 min');
    expect(filmMeta(null, null)).toBe('');
  });
  it('tronque sans couper un mot ni garder la syntaxe Markdown', () => {
    const out = truncate(
      '## Titre **gras** et une phrase assez longue pour être coupée proprement',
      40,
    );
    expect(out.length).toBeLessThanOrEqual(40);
    expect(out).not.toMatch(/[#*]/);
    expect(out.endsWith('…')).toBe(true);
  });
});

describe('markdown restreint', () => {
  it('découpe titres, listes, citations et paragraphes', () => {
    const blocks = parseBlocks(
      '## Titre\n\nUn paragraphe\nsur deux lignes.\n\n- un\n- deux\n\n> citation',
    );
    expect(blocks.map((b) => b.kind)).toEqual(['h2', 'p', 'ul', 'quote']);
    expect(blocks[1]).toMatchObject({ text: 'Un paragraphe sur deux lignes.' });
    expect(blocks[2]).toMatchObject({ items: ['un', 'deux'] });
  });
  it('ne produit jamais de HTML brut', () => {
    const blocks = parseBlocks('<script>alert(1)</script>');
    expect(blocks).toEqual([{ kind: 'p', text: '<script>alert(1)</script>' }]);
  });
});

describe('chargeur d’images', () => {
  it('choisit la plus petite largeur suffisante', () => {
    expect(ecineImageLoader({ src: 'https://media/images/abc', width: 500 })).toBe(
      'https://media/images/abc/w640.webp',
    );
    expect(ecineImageLoader({ src: 'https://media/images/abc', width: 3000 })).toBe(
      'https://media/images/abc/w1920.webp',
    );
  });
  it('laisse les fichiers locaux intacts', () => {
    expect(ecineImageLoader({ src: '/icons/icon-192.png', width: 192 })).toBe(
      '/icons/icon-192.png',
    );
  });
});

describe('routes', () => {
  it('produit des URL stables par langue', () => {
    expect(routes.film('fr', 'mon-film')).toBe('/fr/films/mon-film');
    expect(routes.search('fr', 'rumba mama')).toBe('/fr/recherche?q=rumba%20mama');
  });
});
