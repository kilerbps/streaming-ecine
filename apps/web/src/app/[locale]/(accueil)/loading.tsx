import { getTranslations } from 'next-intl/server';
import { FeedSkeleton } from '@/components/ui/page-skeletons';

/**
 * Chargement de l'accueil. Dans le groupe (accueil) pour ne couvrir que l'accueil : un skeleton au
 * niveau [locale] engloberait toutes les pages et ferait répondre 200 aux URL inconnues.
 */
export default async function Loading() {
  const t = await getTranslations('common');
  return <FeedSkeleton label={t('loading')} />;
}
