import { getTranslations } from 'next-intl/server';
import { NewsSkeleton } from '@/components/ui/page-skeletons';

/** Chargement : Actualités (skeleton à la forme de l'écran, visible après 150 ms). */
export default async function Loading() {
  const t = await getTranslations('common');
  return <NewsSkeleton label={t('loading')} />;
}
