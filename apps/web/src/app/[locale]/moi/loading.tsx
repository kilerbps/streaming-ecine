import { getTranslations } from 'next-intl/server';
import { MeSkeleton } from '@/components/ui/page-skeletons';

/** Chargement : Moi (skeleton à la forme de l'écran, visible après 150 ms). */
export default async function Loading() {
  const t = await getTranslations('common');
  return <MeSkeleton label={t('loading')} />;
}
