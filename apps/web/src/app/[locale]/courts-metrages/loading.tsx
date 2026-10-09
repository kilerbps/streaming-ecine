import { getTranslations } from 'next-intl/server';
import { CatalogSkeleton } from '@/components/ui/page-skeletons';

/** Chargement : Courts-métrages (skeleton à la forme de l'écran, visible après 150 ms). */
export default async function Loading() {
  const t = await getTranslations('common');
  return <CatalogSkeleton label={t('loading')} />;
}
