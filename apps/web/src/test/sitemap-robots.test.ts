import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/config', () => ({ serverConfig: () => ({ SITE_URL: 'https://ecine.art' }) }));
vi.mock('next/server', () => ({ connection: async () => undefined }));
const getSitemapData = vi.fn();
vi.mock('@/server/data', () => ({ getSitemapData: () => getSitemapData() }));

const { default: sitemap } = await import('@/app/sitemap');
const { default: robots } = await import('@/app/robots');

afterEach(() => {
  vi.unstubAllEnvs();
  getSitemapData.mockReset();
});

describe('sitemap', () => {
  it('liste contenus, dates, images et hreflang', async () => {
    getSitemapData.mockResolvedValue({
      films: [
        { slug: 'kin', updatedAt: '2026-10-20T00:00:00.000Z', image: 'https://m/i/w1280.webp' },
      ],
      people: [],
      articles: [],
      pages: [{ slug: 'cookies', updatedAt: '2026-10-01T00:00:00.000Z' }],
      categories: [{ slug: 'drame', updatedAt: '2026-10-19T00:00:00.000Z' }],
      posts: [{ id: 'p1', updatedAt: '2026-10-18T00:00:00.000Z', image: null }],
    });
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain('https://ecine.art/fr');
    expect(urls).toContain('https://ecine.art/fr/nouveautes');
    expect(urls).toContain('https://ecine.art/fr/publications/p1');
    expect(urls).toContain('https://ecine.art/fr/cookies');
    expect(urls).not.toContain('https://ecine.art/fr/recherche');
    const film = entries.find((e) => e.url === 'https://ecine.art/fr/films/kin');
    expect(film).toMatchObject({
      lastModified: '2026-10-20T00:00:00.000Z',
      images: ['https://m/i/w1280.webp'],
      alternates: {
        languages: {
          fr: 'https://ecine.art/fr/films/kin',
          'x-default': 'https://ecine.art/fr/films/kin',
        },
      },
    });
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('API injoignable : erreur (jamais un sitemap vidé)', async () => {
    getSitemapData.mockRejectedValue(new Error('API indisponible'));
    await expect(sitemap()).rejects.toThrow('API indisponible');
  });
});

describe('robots', () => {
  it('phase de test : tout est interdit', async () => {
    vi.stubEnv('SITE_INDEXABLE', 'false');
    expect(await robots()).toEqual({ rules: [{ userAgent: '*', disallow: '/' }] });
  });

  it('ouvert : public explorable, pages en noindex lisibles, sitemap annoncé', async () => {
    vi.stubEnv('SITE_INDEXABLE', 'true');
    const result = await robots();
    expect(result.sitemap).toBe('https://ecine.art/sitemap.xml');
    const [rule] = Array.isArray(result.rules) ? result.rules : [result.rules];
    expect(rule?.disallow).toEqual(['/admin', '/api/', '/fr/recherche']);
    expect(rule?.disallow).not.toContain('/fr/compte');
  });
});
