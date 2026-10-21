import type { Metadata } from 'next';
import type { Locale } from '@ecine/contracts';
import { StaticPageView, staticPageMetadata } from '@/components/features/content/static-page';
import { getStaticPage } from '@/server/data';
import { isMissing, redirectOrNotFound } from '@/server/not-found';

type Props = PageProps<'/[locale]/[...introuvable]'>;

/** Page éditoriale publiée à ce slug (un seul segment), ou `null`. */
async function findStaticPage(segments: string[]) {
  if (segments.length !== 1 || !segments[0]) return null;
  try {
    return await getStaticPage(segments[0]);
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, introuvable } = await params;
  const page = await findStaticPage(introuvable);
  return page ? staticPageMetadata(locale as Locale, page.slug) : {};
}

/**
 * Toute URL sans route dédiée : page créée en administration (FR-102, `/fr/{slug}`), sinon
 * redirection enregistrée (ancien lien), sinon 404 localisée.
 */
export default async function CatchAll({ params }: Props) {
  const { locale, introuvable } = await params;
  const page = await findStaticPage(introuvable);
  if (page) return <StaticPageView locale={locale as Locale} slug={page.slug} />;
  return redirectOrNotFound(`/${locale}/${introuvable.map(encodeURIComponent).join('/')}`);
}
