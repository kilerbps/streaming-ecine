import { getTranslations } from 'next-intl/server';
import { FeedSkeleton } from '@/components/ui/page-skeletons';

/** Chargement : Découvrir (skeleton à la forme de l'écran, visible après 150 ms). */
export default async function Loading() {
  const t = await getTranslations('common');
  return <FeedSkeleton label={t('loading')} />;
}
