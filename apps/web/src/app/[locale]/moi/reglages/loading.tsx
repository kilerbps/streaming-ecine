import { getTranslations } from 'next-intl/server';
import { FormSkeleton } from '@/components/ui/page-skeletons';

/** Chargement : Réglages (skeleton à la forme de l'écran, visible après 150 ms). */
export default async function Loading() {
  const t = await getTranslations('common');
  return <FormSkeleton label={t('loading')} />;
}
