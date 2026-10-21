import { getCategories } from '@/server/data';
import { redirectOrNotFound } from '@/server/not-found';

/**
 * Vérifie que la catégorie existe avant le skeleton de la fiche (`loading.tsx`) : une fois le flux commencé,
 * le statut HTTP ne peut plus changer. Ainsi une adresse inconnue répond 404 et un ancien lien
 * (catégorie renommée) 301 (FR-132, FR-133). Le chargement est mis en cache pour la requête.
 */
export default async function CategoryGuard({
  children,
  params,
}: LayoutProps<'/[locale]/categories/[slug]'>) {
  const { locale, slug } = await params;
  const categories = await getCategories();
  if (!categories.some((category) => category.slug === slug)) {
    await redirectOrNotFound(`/${locale}/categories/${slug}`);
  }
  return children;
}
