import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/server/seo';

/** Lu à chaque requête : `SITE_INDEXABLE` vient de l'environnement du serveur, pas de la construction. */
export const dynamic = 'force-dynamic';

/**
 * Public autorisé ; administration, espace personnel, comptes, recherche interne et API interdits.
 * Phase de test (`SITE_INDEXABLE` différent de `true`, ADR-0016) : tout est interdit aux robots.
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.SITE_INDEXABLE !== 'true') {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }
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
