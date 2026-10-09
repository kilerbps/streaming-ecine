import { getTranslations } from 'next-intl/server';
import { DetailSkeleton } from '@/components/ui/page-skeletons';

/** Chargement : Fiche talent (skeleton à la forme de l'écran, visible après 150 ms). */
export default async function Loading() {
  const t = await getTranslations('common');
  return <DetailSkeleton label={t('loading')} media="portrait" />;
}
