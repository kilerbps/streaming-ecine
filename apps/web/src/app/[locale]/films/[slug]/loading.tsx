import { getTranslations } from 'next-intl/server';
import { FilmSkeleton } from '@/components/ui/page-skeletons';

/** Chargement : Fiche film (skeleton à la forme de l'écran, visible après 150 ms). */
export default async function Loading() {
  const t = await getTranslations('common');
  return <FilmSkeleton label={t('loading')} />;
}
