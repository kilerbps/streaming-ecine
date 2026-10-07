import 'server-only';
import type { Metadata } from 'next';
import { LOCALES, type Image, type Locale } from '@ecine/contracts';
import { truncate } from '@/lib/format';
import { serverConfig } from './config';

/** URL absolue publique. */
export function absoluteUrl(path: string): string {
  return new URL(path, serverConfig().SITE_URL).toString();
}

/** Variante d'image de 1280 px pour Open Graph (déjà compressée par l'API). */
export function ogImage(image: Image | null | undefined): string | undefined {
  return image ? `${image.src}/w1280.webp` : undefined;
}

/**
 * Métadonnées d'une page publique : titre < 60 car., description < 160 car., canonical, hreflang,
 * Open Graph et Twitter. `path` est le chemin sans préfixe de langue (ex. « /films/mon-film »).
 */
export function pageMetadata({
  locale,
  path,
  title,
  description,
  image,
  noIndex,
  type = 'website',
}: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  image?: Image | null;
  noIndex?: boolean;
  type?: 'website' | 'article' | 'video.movie' | 'profile';
}): Metadata {
  const canonical = absoluteUrl(`/${locale}${path}`);
  const desc = truncate(description, 158);
  const cover = ogImage(image);
  const languages = Object.fromEntries(LOCALES.map((l) => [l, absoluteUrl(`/${l}${path}`)]));
  return {
    title: truncate(title, 58),
    description: desc,
    alternates: { canonical, languages: { ...languages, 'x-default': absoluteUrl(`/fr${path}`) } },
    robots: noIndex ? { index: false, follow: true } : undefined,
    openGraph: {
      type:
        type === 'video.movie'
          ? 'video.movie'
          : type === 'profile'
            ? 'profile'
            : type === 'article'
              ? 'article'
              : 'website',
      url: canonical,
      title,
      description: desc,
      siteName: 'E-Ciné',
      locale: 'fr_CD',
    },
    // Images 1200×630 : fichiers opengraph-image des pages (prioritaires) ; sinon l'affiche du contenu.
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: cover ? [cover] : undefined,
    },
  };
}
