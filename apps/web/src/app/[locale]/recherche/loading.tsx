import { getTranslations } from 'next-intl/server';
import { SearchSkeleton } from '@/components/ui/page-skeletons';

/** Chargement : Recherche (skeleton à la forme de l'écran, visible après 150 ms). */
export default async function Loading() {
  const t = await getTranslations('common');
  return <SearchSkeleton label={t('loading')} />;
}
