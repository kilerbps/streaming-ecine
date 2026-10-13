import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@ecine/contracts';
import { VerifyEmailBanner } from '@/components/features/account/account-settings';
import { LogoutButton } from '@/components/features/account/logout-button';
import { ContinueWatching } from '@/components/features/content/continue-watching';
import { FilmTile } from '@/components/features/content/film-tile';
import { CookiePreferencesRow } from '@/components/layout/cookie-banner';
import { LargeTitle } from '@/components/layout/header-title';
import { InstallAppRow } from '@/components/pwa/install-prompt';
import { LinkButton } from '@/components/ui/link-button';
import { LIST_GROUP, ListLink } from '@/components/ui/list-row';
import { Row } from '@/components/ui/row';
import { initials } from '@/lib/format';
import { routes } from '@/lib/routes';
import { getBookmarks, getContinueWatching, getViewer } from '@/server/data';

export const metadata: Metadata = { title: 'Mon espace' };

const SECTION_TITLE = 'mb-3 text-xl leading-[25px] lg:text-2xl lg:leading-[30px]';

/**
 * Moi (docs/design/04, Moi) : l'espace de la personne et le seul endroit des réglages, utile même
 * sans compte. Membre : avatar à initiales, rangées Reprendre et Ma liste, puis la liste des entrées
 * (lignes de 52 px). Visiteur : un seul bouton principal, Se connecter.
 */
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

  const menu = (member: { isTeam: boolean } | null) => (
    <nav aria-label={t('menu')} className="mt-10 flex flex-col gap-6 lg:max-w-2xl">
      <ul className={LIST_GROUP}>
        <ListLink href={routes.settings(locale)} icon="settings" label={t('settings')} />
        {member ? (
          <ListLink
            href={`${routes.settings(locale)}#compte`}
            icon="user"
            label={t('accountSecurity')}
          />
        ) : null}
        <InstallAppRow />
      </ul>
      <ul className={LIST_GROUP}>
        <ListLink href={routes.contact(locale)} icon="mail" label={t('help')} />
        <ListLink href={routes.about(locale)} icon="film" label={tn('about')} />
        <ListLink href={routes.legal(locale)} icon="document" label={t('legal')} />
        <CookiePreferencesRow />
      </ul>
      {member ? (
        <ul className={LIST_GROUP}>
          {member.isTeam ? <ListLink href="/admin" icon="dashboard" label={tn('admin')} /> : null}
          <li>
            <LogoutButton variant="row" />
          </li>
        </ul>
      ) : null}
    </nav>
  );

  if (!viewer) {
    return (
      <>
        <header className="flex flex-col gap-3">
          <LargeTitle>{t('guestTitle')}</LargeTitle>
          <p className="max-w-xl text-[15px] leading-5 text-muted md:text-[17px] md:leading-[22px]">
            {t('guestBody')}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-3">
            <LinkButton
              href={`${routes.login(locale)}?retour=${encodeURIComponent(routes.me(locale))}`}
              variant="primary"
              size="lg"
            >
              {ta('login')}
            </LinkButton>
            <Link
              href={routes.register(locale)}
              className="inline-flex min-h-11 items-center text-[17px] font-semibold underline-offset-4 hover:underline"
            >
              {ta('register')}
            </Link>
          </div>
        </header>
        {menu(null)}
      </>
    );
  }

  const [continueWatching, bookmarks] = await Promise.all([getContinueWatching(), getBookmarks()]);
  const isTeam = viewer.role !== 'MEMBER' && viewer.role !== 'CREATOR';
  const firstName = viewer.displayName.split(/\s+/)[0] ?? viewer.displayName;
  return (
    <>
      <header className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="grid size-16 shrink-0 place-items-center rounded-full bg-surface-3 text-xl font-semibold text-text lg:size-20 lg:text-2xl"
        >
          {initials(viewer.displayName)}
        </span>
        <LargeTitle>{t('hello', { name: firstName })}</LargeTitle>
      </header>
      {!viewer.emailVerified ? (
        <div className="mt-6">
          <VerifyEmailBanner />
        </div>
      ) : null}
      {continueWatching.length > 0 ? (
        <div className="bleed mt-8">
          <ContinueWatching items={continueWatching} locale={locale} />
        </div>
      ) : null}
      {bookmarks.items.length > 0 ? (
        <div className="bleed mt-8">
          <Row
            id="ma-liste"
            title={t('myList')}
            seeAll={{ href: routes.myList(locale), label: `${tc('seeAll')} : ${t('myList')}` }}
          >
            {bookmarks.items.slice(0, 12).map((film) => (
              <FilmTile key={film.id} film={film} locale={locale} layout="row" />
            ))}
          </Row>
        </div>
      ) : (
        <section aria-labelledby="ma-liste" className="mt-8">
          <h2 id="ma-liste" className={SECTION_TITLE}>
            {t('myList')}
          </h2>
          <p className="max-w-xl text-[15px] leading-5 text-muted">{t('myListEmpty')}</p>
        </section>
      )}
      {menu({ isTeam })}
    </>
  );
}
