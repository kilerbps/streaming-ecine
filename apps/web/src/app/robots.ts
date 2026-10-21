import type { MetadataRoute } from 'next';
import { connection } from 'next/server';
import { absoluteUrl } from '@/server/seo';

/**
 * Public autorisé ; administration, API et recherche interne (espace d'URL infini) interdits.
 * Les pages en `noindex` (compte, espace personnel, hors ligne) restent explorables : un robot
 * bloqué ne lirait pas leur `noindex` et pourrait indexer l'adresse seule.
 * Phase de test (`SITE_INDEXABLE` différent de `true`, ADR-0016) : tout est interdit aux robots.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  // Lu à chaque requête : `SITE_INDEXABLE` vient de l'environnement du serveur, pas de la construction.
  await connection();
  if (process.env.SITE_INDEXABLE !== 'true') {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/fr/recherche'] }],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
