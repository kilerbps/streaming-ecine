import { guardStaticPage } from '@/components/features/content/static-page';

/** Vérifie la page avant le skeleton (`loading.tsx`) : 404 ou 301 avec le bon statut HTTP. */
export default async function Guard({
  children,
  params,
}: LayoutProps<'/[locale]/confidentialite'>) {
  const { locale } = await params;
  await guardStaticPage(locale, 'confidentialite');
  return children;
}
