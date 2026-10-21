import { describe, expect, it, vi } from 'vitest';

vi.mock('./config', () => ({ serverConfig: () => ({ SITE_URL: 'https://ecine.art' }) }));
vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => `meta.${key}`,
}));

const { pageMetadata, pageTitle, TITLE_MAX, TITLE_SUFFIX } = await import('./seo');

describe('pageTitle', () => {
  it('garde le suffixe de marque quand le tout tient en 60 caractères', () => {
    expect(pageTitle('Films')).toBe('Films');
  });

  it('retire le suffixe et coupe au mot quand le titre est trop long', () => {
    const long = 'Un titre de film vraiment très long pour un moteur de recherche';
    const title = pageTitle(long);
    expect(title).toEqual({ absolute: expect.any(String) });
    const absolute = (title as { absolute: string }).absolute;
    expect(absolute.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(absolute.endsWith('…')).toBe(true);
  });

  it('ne répète pas la marque quand le titre la nomme déjà', () => {
    expect(pageTitle('À propos d’E-Ciné')).toEqual({ absolute: 'À propos d’E-Ciné' });
  });

  it('ne dépasse jamais 60 caractères avec le suffixe', () => {
    const title = 'x'.repeat(TITLE_MAX - TITLE_SUFFIX.length);
    expect(pageTitle(title)).toBe(title);
    expect(pageTitle(`${title}x`)).toEqual({ absolute: expect.any(String) });
  });
});

describe('pageMetadata', () => {
  it('donne canonical, hreflang et x-default, avec l’image de partage commune', async () => {
    const meta = await pageMetadata({
      locale: 'fr',
      path: '/films',
      title: 'Films',
      description: 'Longs-métrages du cinéma congolais.',
    });
    expect(meta.alternates).toEqual({
      canonical: 'https://ecine.art/fr/films',
      languages: { fr: 'https://ecine.art/fr/films', 'x-default': 'https://ecine.art/fr/films' },
    });
    expect(meta.robots).toBeUndefined();
    expect(meta.openGraph).toMatchObject({
      url: 'https://ecine.art/fr/films',
      siteName: 'E-Ciné',
      images: [
        {
          url: 'https://ecine.art/fr/opengraph-image',
          width: 1200,
          height: 630,
          alt: 'meta.shareImageAlt',
        },
      ],
    });
    // Twitter reprend l'image d'Open Graph (aucune image propre).
    expect(meta.twitter).not.toHaveProperty('images');
  });

  it('laisse le fichier opengraph-image de la page fournir l’image', async () => {
    const meta = await pageMetadata({
      locale: 'fr',
      path: '/films/kin',
      title: 'Kin',
      description: 'Synopsis.',
      shareImage: 'page',
      type: 'video.movie',
    });
    // La clé ne doit pas exister : Next.js ignorerait sinon le fichier de la page.
    expect(meta.openGraph).not.toHaveProperty('images');
    expect(meta.openGraph).toMatchObject({ type: 'video.movie' });
  });

  it('pages suivantes et contenus masqués : noindex, follow et aucune canonical', async () => {
    const meta = await pageMetadata({
      locale: 'fr',
      path: '/films',
      title: 'Films',
      description: 'Liste.',
      noIndex: true,
    });
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates).toBeUndefined();
  });

  it('description de 160 caractères au plus, sans Markdown ni adresse de lien', async () => {
    const meta = await pageMetadata({
      locale: 'fr',
      path: '/cookies',
      title: 'Cookies',
      description: `## Cookies\n\nVoir [la politique](https://ecine.art/fr/confidentialite) et ${'mot '.repeat(60)}`,
    });
    expect(meta.description).not.toContain('https://');
    expect(meta.description).not.toContain('#');
    expect(meta.description?.length).toBeLessThanOrEqual(160);
    expect(meta.description).toMatch(/^Cookies Voir la politique et mot/);
  });
});
