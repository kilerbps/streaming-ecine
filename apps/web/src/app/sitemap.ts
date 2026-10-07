import type { MetadataRoute } from 'next';
import { LOCALES } from '@ecine/contracts';
import { getSitemapData } from '@/server/data';
import { absoluteUrl } from '@/server/seo';

/** Sitemap dynamique (films, personnes, actualités, pages, catégories) avec hreflang. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getSitemapData().catch(() => null);
  const entry = (
    path: string,
    lastModified?: string,
    priority = 0.6,
  ): MetadataRoute.Sitemap[number] => ({
    url: absoluteUrl(`/fr${path}`),
    lastModified,
    priority,
    alternates: {
      languages: Object.fromEntries(LOCALES.map((l) => [l, absoluteUrl(`/${l}${path}`)])),
    },
  });
  const staticPaths = ['', '/films', '/courts-metrages', '/personnes', '/actualites', '/contact'];
  return [
    ...staticPaths.map((p) => entry(p, undefined, p === '' ? 1 : 0.8)),
    ...(data?.films ?? []).map((f) => entry(`/films/${f.slug}`, f.updatedAt, 0.9)),
    ...(data?.people ?? []).map((p) => entry(`/personnes/${p.slug}`, p.updatedAt, 0.8)),
    ...(data?.articles ?? []).map((a) => entry(`/actualites/${a.slug}`, a.updatedAt, 0.7)),
    ...(data?.categories ?? []).map((c) => entry(`/categories/${c.slug}`, c.updatedAt, 0.5)),
    ...(data?.pages ?? []).map((p) => entry(`/${p.slug}`, p.updatedAt, 0.3)),
  ];
}
