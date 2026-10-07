import type { Metadata } from 'next';
import type { Locale } from '@ecine/contracts';
import { StaticPageView, staticPageMetadata } from '@/components/features/content/static-page';

const SLUG = 'cookies';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/cookies'>): Promise<Metadata> {
  const { locale } = await params;
  return staticPageMetadata(locale as Locale, SLUG);
}

/** Texte juridique géré en administration ; structure fournie, contenu à valider par un juriste (docs/07 §C). */
export default async function LegalPage({ params }: PageProps<'/[locale]/cookies'>) {
  const { locale } = await params;
  return <StaticPageView locale={locale as Locale} slug={SLUG} />;
}
