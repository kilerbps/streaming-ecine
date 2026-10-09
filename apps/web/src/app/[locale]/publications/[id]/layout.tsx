import { getPost } from '@/server/data';
import { loadOrNotFound } from '@/server/not-found';

/**
 * Vérifie que la publication existe avant le skeleton de la fiche (`loading.tsx`) : une fois le flux commencé,
 * le statut HTTP ne peut plus changer. Ainsi une adresse inconnue répond 404 et un ancien lien 301
 * (FR-132, FR-133). Le chargement est mis en cache pour la requête : la page ne le refait pas.
 */
export default async function PostGuard({
  children,
  params,
}: LayoutProps<'/[locale]/publications/[id]'>) {
  const { locale, id } = await params;
  await loadOrNotFound(() => getPost(id), `/${locale}/publications/${id}`);
  return children;
}
