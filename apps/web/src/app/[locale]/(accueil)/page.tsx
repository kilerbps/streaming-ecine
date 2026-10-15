import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@ecine/contracts';
import { HomeFeatured } from '@/components/features/home/home-featured';
import { HomeRows } from '@/components/features/home/home-rows';
import { PullToRefresh } from '@/components/features/system/pull-to-refresh';
import { LinkButton } from '@/components/ui/link-button';
import { routes } from '@/lib/routes';
import { applyPersonal } from '@/lib/home-rows';
import {
  getBookmarks,
  getContinueWatching,
  getHome,
  getPersonalHome,
  getViewer,
} from '@/server/data';
import { personalizationAllowed } from '@/server/personalization';
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
  const [t, home, continueWatching, personal, viewer, allowed] = await Promise.all([
    getTranslations('home'),
    getHome(),
    getContinueWatching(),
    getPersonalHome().catch(() => null),
    getViewer(),
    personalizationAllowed(),
  ]);
  // Ma liste du membre : état des menus contextuels (« Ajouter » ou « Retirer »).
  const bookmarks = viewer ? await getBookmarks().catch(() => null) : null;
  return (
    <>
      <PullToRefresh />
      <h1 className="sr-only">{t('title')}</h1>
      <div className="pt-2 lg:pt-0">
        <HomeFeatured items={home.featured} locale={locale} />
      </div>
      <div className="mt-8 lg:mt-10">
        <HomeRows
          rows={applyPersonal(home.rows, personal)}
          continueWatching={continueWatching}
          locale={locale}
          canDismiss={Boolean(viewer) || allowed}
          bookmarkedIds={bookmarks?.items.map((film) => film.id) ?? []}
        />
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
