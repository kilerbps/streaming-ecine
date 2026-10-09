import { AdminSkeleton } from '@/components/ui/page-skeletons';

/** Chargement d'un écran d'administration : titre, filtres et tableau (lectures API côté serveur). */
export default function AdminLoading() {
  return <AdminSkeleton label="Chargement de l'écran…" />;
}
