import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@ecine/contracts';
import { HomeFeatured } from '@/components/features/home/home-featured';
import { HomeRows } from '@/components/features/home/home-rows';
import { PullToRefresh } from '@/components/features/system/pull-to-refresh';
import { LinkButton } from '@/components/ui/link-button';
import { routes } from '@/lib/routes';
import { getContinueWatching, getHome } from '@/server/data';
import { pageMetadata } from '@/server/seo';

export async function generateMetadata({ params }: PageProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('meta');
  return {
    ...pageMetadata({
      locale: locale as Locale,
      path: '',
      title: t('defaultTitle'),
      description: t('defaultDescription'),
    }),
    title: { absolute: t('defaultTitle') },
  };
}

/**
 * Accueil (docs/design/04, Accueil) : affiche à la une avec un seul bouton « Regarder », puis des
 * rangées parcourues au pouce (Reprendre, Top 10, Nouveautés, Courts-métrages, Bientôt, Talents,
 * sélections, catégories). Le fil vertical est dans l'onglet Découvrir.
 */
export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const [t, home, continueWatching] = await Promise.all([
    getTranslations('home'),
    getHome(),
    getContinueWatching(),
  ]);
  return (
    <>
      <PullToRefresh />
      <h1 className="sr-only">{t('title')}</h1>
      <div className="pt-2 lg:pt-0">
        <HomeFeatured items={home.featured} locale={locale} />
      </div>
      <div className="mt-8 lg:mt-10">
        <HomeRows rows={home.rows} continueWatching={continueWatching} locale={locale} />
      </div>
      <section className="container-page mt-12 flex flex-col items-center gap-4 pb-6 text-center lg:mt-16">
        <p className="text-[15px] leading-5 text-muted">{t('end')}</p>
        <LinkButton transitionTypes={['tab']} href={routes.discover(locale)} icon="discover">
          {t('openDiscover')}
        </LinkButton>
      </section>
    </>
  );
}
