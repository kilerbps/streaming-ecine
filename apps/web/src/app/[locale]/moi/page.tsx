import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@ecine/contracts';
import { VerifyEmailBanner } from '@/components/features/account/account-settings';
import { LogoutButton } from '@/components/features/account/logout-button';
import { PreferencesPanel } from '@/components/features/account/preferences-panel';
import { ContinueWatching } from '@/components/features/content/continue-watching';
import { FilmTile, TileGrid } from '@/components/features/content/film-tile';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { LinkButton } from '@/components/ui/link-button';
import { routes } from '@/lib/routes';
import { getBookmarks, getContinueWatching, getViewer } from '@/server/data';

export const metadata: Metadata = { title: 'Mon espace' };

export default async function MePage({ params }: PageProps<'/[locale]/moi'>) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const [t, ta, tc, tn, viewer] = await Promise.all([
    getTranslations('me'),
    getTranslations('auth'),
    getTranslations('common'),
    getTranslations('nav'),
    getViewer(),
  ]);

  if (!viewer) {
    return (
      <>
        <h1 className="font-serif text-4xl md:text-6xl">{t('guestTitle')}</h1>
        <p className="mt-4 max-w-xl text-lg text-muted">{t('guestBody')}</p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <LinkButton
            href={`${routes.login(locale)}?retour=${encodeURIComponent(routes.me(locale))}`}
            variant="primary"
            size="lg"
          >
            {ta('login')}
          </LinkButton>
          <Link
            href={routes.register(locale)}
            className="inline-flex min-h-11 items-center underline underline-offset-4"
          >
            {ta('register')}
          </Link>
        </div>
        <section className="mt-16 max-w-xl">
          <h2 className="mb-4 font-serif text-2xl">{t('settings')}</h2>
          <PreferencesPanel />
        </section>
      </>
    );
  }

  const [continueWatching, bookmarks] = await Promise.all([getContinueWatching(), getBookmarks()]);
  const isTeam = viewer.role !== 'MEMBER' && viewer.role !== 'CREATOR';
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-4xl md:text-6xl">
          {ta('welcome', { name: viewer.displayName })}
        </h1>
        <Link
          href={routes.settings(locale)}
          className="inline-flex min-h-11 items-center gap-2 underline-offset-4 hover:underline"
        >
          <Icon name="settings" size={20} />
          {t('settings')}
        </Link>
      </header>
      {!viewer.emailVerified ? (
        <div className="mt-6">
          <VerifyEmailBanner />
        </div>
      ) : null}
      <div className="mt-10">
        <ContinueWatching items={continueWatching} locale={locale} />
      </div>
      <section aria-labelledby="ma-liste" className="mt-6">
        <div className="mb-6 flex items-end justify-between">
          <h2 id="ma-liste" className="font-serif text-3xl">
            {t('myList')}
          </h2>
          {bookmarks.items.length > 0 ? (
            <Link href={routes.myList(locale)} className="meta hover:text-text">
              {tc('seeAll')}
            </Link>
          ) : null}
        </div>
        {bookmarks.items.length === 0 ? (
          <EmptyState title={t('myListEmpty')} />
        ) : (
          <TileGrid>
            {bookmarks.items.slice(0, 10).map((film) => (
              <FilmTile key={film.id} film={film} locale={locale} />
            ))}
          </TileGrid>
        )}
      </section>
      {isTeam ? (
        <p className="mt-12">
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center gap-2 underline underline-offset-4"
          >
            <Icon name="settings" size={20} />
            {tn('admin')}
          </Link>
        </p>
      ) : null}
      <div className="mt-16 border-t border-border pt-8">
        <LogoutButton />
      </div>
    </>
  );
}
