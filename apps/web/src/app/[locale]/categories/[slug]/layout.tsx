import { notFound } from 'next/navigation';
import { getCategories } from '@/server/data';

/**
 * Vérifie que la catégorie existe avant le skeleton de la fiche (`loading.tsx`) : une fois le flux commencé,
 * le statut HTTP ne peut plus changer. Ainsi une adresse inconnue répond 404 et un ancien lien 301
 * (FR-132, FR-133). Le chargement est mis en cache pour la requête : la page ne le refait pas.
 */
export default async function CategoryGuard({
  children,
  params,
}: LayoutProps<'/[locale]/categories/[slug]'>) {
  const { slug } = await params;
  const categories = await getCategories();
  if (!categories.some((category) => category.slug === slug)) notFound();
  return children;
}
