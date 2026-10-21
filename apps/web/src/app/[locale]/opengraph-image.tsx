import { getTranslations } from 'next-intl/server';
import { LOCALES } from '@ecine/contracts';
import { ogCard, ogContentType, ogSize } from '@/server/og';

export const size = ogSize;
export const contentType = ogContentType;
export const alt = 'E-Ciné, le cinéma congolais en streaming';

/** Une image par langue, construite une fois (aucune donnée de l'API). */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

/**
 * Image de partage commune 1200×630 (docs/07 §A7) : accueil, catalogues, catégories, pages fixes ;
 * les fiches film, talent et actualité ont la leur.
 */
export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });
  // La signature du bas de la carte porte déjà « le cinéma congolais, en streaming ».
  return ogCard({
    eyebrow: [t('films'), t('shorts'), t('people'), t('news')].join(' · '),
    title: 'E-Ciné',
  });
}
