import 'server-only';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LOCALES, type Image, type Locale } from '@ecine/contracts';
import { truncate } from '@/lib/format';
import { serverConfig } from './config';

/** URL absolue publique. */
export function absoluteUrl(path: string): string {
  return new URL(path, serverConfig().SITE_URL).toString();
}

/** Variante d'image de 1280 px (données structurées, déjà compressée par l'API). */
export function ogImage(image: Image | null | undefined): string | undefined {
  return image ? `${image.src}/w1280.webp` : undefined;
}

/** Longueur affichée par les moteurs ; le gabarit « %s · E-Ciné » (messages `meta.titleTemplate`) s'y ajoute. */
export const TITLE_MAX = 60;
export const TITLE_SUFFIX = ' · E-Ciné';
export const DESCRIPTION_MAX = 158;

/** Image de partage 1200×630 commune (`app/[locale]/opengraph-image.tsx`). */
export function defaultShareImage(locale: Locale) {
  return absoluteUrl(`/${locale}/opengraph-image`);
}

/**
 * Titre de page : avec le suffixe de marque s'il tient en 60 caractères, sinon le titre seul
 * (tronqué au mot) plutôt qu'un titre coupé par le moteur.
 */
export function pageTitle(title: string): Metadata['title'] {
  const clean = title.replace(/\s+/g, ' ').trim();
  // Titre qui nomme déjà la marque (« À propos d'E-Ciné ») : pas de répétition.
  const branded = /e-cin[ée]/i.test(clean);
  if (!branded && clean.length + TITLE_SUFFIX.length <= TITLE_MAX) return clean;
  return { absolute: truncate(clean, TITLE_MAX) };
}

/**
 * Métadonnées d'une page publique : titre ≤ 60 caractères, description ≤ 160, canonical, hreflang,
 * Open Graph et Twitter. `path` est le chemin sans préfixe de langue (ex. « /films/mon-film »).
 *
 * - `shareImage: 'page'` : la page a son propre fichier `opengraph-image` (film, talent,
 *   actualité) ; aucune image n'est déclarée ici, sinon Next.js ignorerait ce fichier.
 * - `noIndex` (pages suivantes d'une liste, contenu masqué) : `noindex, follow` et aucune canonical,
 *   pour ne pas envoyer deux signaux contraires.
 */
export async function pageMetadata({
  locale,
  path,
  title,
  description,
  noIndex,
  type = 'website',
  shareImage = 'default',
}: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  noIndex?: boolean;
  type?: 'website' | 'article' | 'video.movie' | 'profile';
  shareImage?: 'default' | 'page';
}): Promise<Metadata> {
  const url = absoluteUrl(`/${locale}${path}`);
  const desc = truncate(description, DESCRIPTION_MAX);
  const ogTitle = truncate(title, TITLE_MAX);
  const languages = Object.fromEntries(LOCALES.map((l) => [l, absoluteUrl(`/${l}${path}`)]));
  const images =
    shareImage === 'default'
      ? [
          {
            url: defaultShareImage(locale),
            width: 1200,
            height: 630,
            alt: (await getTranslations({ locale, namespace: 'meta' }))('shareImageAlt'),
          },
        ]
      : undefined;
  return {
    title: pageTitle(title),
    description: desc,
    alternates: noIndex
      ? undefined
      : { canonical: url, languages: { ...languages, 'x-default': absoluteUrl(`/fr${path}`) } },
    robots: noIndex ? { index: false, follow: true } : undefined,
    openGraph: {
      type,
      url,
      title: ogTitle,
      description: desc,
      siteName: 'E-Ciné',
      locale: 'fr_CD',
      ...(images ? { images } : {}),
    },
    // Sans `images` : Next.js reprend celles d'Open Graph (fichier de la page ou image commune).
    twitter: { card: 'summary_large_image', title: ogTitle, description: desc },
  };
}
