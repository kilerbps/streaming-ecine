import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/server/seo';

/** Public autorisé ; administration, espace personnel, comptes, recherche interne et API interdits. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/api/',
          '/fr/moi',
          '/fr/compte',
          '/fr/recherche',
          '/fr/hors-ligne',
          '/fr/design',
        ],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
