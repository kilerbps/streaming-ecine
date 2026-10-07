import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { resolveRedirect } from '@/server/data';

/** Toute URL inconnue : redirection enregistrée (ancien lien) sinon 404 localisée. */
export default async function CatchAll({ params }: PageProps<'/[locale]/[...introuvable]'>) {
  const { locale, introuvable } = await params;
  const path = `/${locale}/${introuvable.map(encodeURIComponent).join('/')}`;
  const target = await resolveRedirect(path).catch(() => null);
  if (target) {
    if (target.status === 302) redirect(target.toPath);
    permanentRedirect(target.toPath);
  }
  notFound();
}
