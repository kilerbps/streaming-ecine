import type { MetadataRoute } from 'next';
import { connection } from 'next/server';
import { LOCALES } from '@ecine/contracts';
import { getSitemapData } from '@/server/data';
import { absoluteUrl } from '@/server/seo';

/** Pages fixes indexables (les listes paginées, la recherche et l'espace personnel n'y sont pas). */
const STATIC_PATHS: Array<[path: string, priority: number]> = [
  ['', 1],
  ['/films', 0.8],
  ['/courts-metrages', 0.8],
  ['/personnes', 0.8],
  ['/actualites', 0.8],
  ['/nouveautes', 0.7],
  ['/decouvrir', 0.6],
  ['/contact', 0.4],
];

function entry(
  path: string,
  {
    lastModified,
    priority = 0.6,
    image,
  }: { lastModified?: string; priority?: number; image?: string | null },
): MetadataRoute.Sitemap[number] {
  return {
    url: absoluteUrl(`/fr${path}`),
    lastModified,
    priority,
    images: image ? [image] : undefined,
    alternates: {
      languages: {
        ...Object.fromEntries(LOCALES.map((l) => [l, absoluteUrl(`/${l}${path}`)])),
        'x-default': absoluteUrl(`/fr${path}`),
      },
    },
  };
}

/**
 * Sitemap dynamique (docs/07 §A9) : films, talents, actualités, publications, catégories et pages,
 * avec dates, images et hreflang. Rendu à la demande (jamais figé à la construction, sans API) ;
 * les données de l'API restent en cache une heure et sont revalidées à chaque publication.
 * API injoignable : erreur 500, pour que les moteurs gardent la dernière version valide au lieu
 * d'un sitemap vidé.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const data = await getSitemapData();
  return [
    ...STATIC_PATHS.map(([path, priority]) => entry(path, { priority })),
    ...data.films.map((f) =>
      entry(`/films/${f.slug}`, { lastModified: f.updatedAt, priority: 0.9, image: f.image }),
    ),
    ...data.people.map((p) =>
      entry(`/personnes/${p.slug}`, { lastModified: p.updatedAt, priority: 0.8, image: p.image }),
    ),
    ...data.articles.map((a) =>
      entry(`/actualites/${a.slug}`, { lastModified: a.updatedAt, priority: 0.7, image: a.image }),
    ),
    ...data.posts.map((p) =>
      entry(`/publications/${p.id}`, { lastModified: p.updatedAt, priority: 0.5, image: p.image }),
    ),
    ...data.categories.map((c) =>
      entry(`/categories/${c.slug}`, { lastModified: c.updatedAt, priority: 0.6 }),
    ),
    ...data.pages.map((p) => entry(`/${p.slug}`, { lastModified: p.updatedAt, priority: 0.3 })),
  ];
}
