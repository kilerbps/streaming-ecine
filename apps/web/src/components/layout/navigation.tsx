'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState, type MouseEvent } from 'react';
import type { Category, Locale } from '@ecine/contracts';
import { useAuth } from '@/components/providers/auth';
import { usePreferences } from '@/components/providers/preferences';
import { Icon, type IconName } from '@/components/ui/icon';
import { Logo } from '@/components/ui/logo';
import { pillClasses, PillLink } from '@/components/ui/pill';
import { SearchField } from '@/components/ui/search-field';
import { Sheet, SheetLink } from '@/components/ui/sheet';
import { routes } from '@/lib/routes';
import { scrollToTop, useScroll } from '@/lib/scroll-state';
import { restoreTabScroll, useTabScrollMemory } from '@/lib/tab-scroll';
import { useHeaderTitle } from './header-title';

/**
 * Coquille native « Nuit de Kin » (docs/design/03-experience-native.md) : barre d'onglets flottante
 * et bouton Recherche sous 1 056 px, navigation haute au-delà, en-tête qui s'efface au défilement.
 */
type TabKey = 'home' | 'discover' | 'whatsNew' | 'me';

interface Tab {
  key: TabKey;
  href: string;
  icon: IconName;
  active: (pathname: string) => boolean;
}

const under = (base: string) => (pathname: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

function tabs(locale: Locale): Tab[] {
  return [
    {
      key: 'home',
      href: routes.home(locale),
      icon: 'home',
      active: (p) => p === routes.home(locale),
    },
    {
      key: 'discover',
      href: routes.discover(locale),
      icon: 'discover',
      active: under(routes.discover(locale)),
    },
    // Nouveautés mène aux actualités jusqu'à l'écran /nouveautes (lot 3 de la refonte).
    {
      key: 'whatsNew',
      href: routes.news(locale),
      icon: 'whatsNew',
      active: (p) => under(routes.news(locale))(p) || under(routes.whatsNew(locale))(p),
    },
    { key: 'me', href: routes.me(locale), icon: 'user', active: under(routes.me(locale)) },
  ];
}

/** Clavier virtuel ouvert : la zone visible rétrécit nettement (API visualViewport). */
function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => setOpen(viewport.height < window.innerHeight * 0.75);
    viewport.addEventListener('resize', update);
    return () => viewport.removeEventListener('resize', update);
  }, []);
  return open;
}

function focusSearchField(): void {
  document.querySelector<HTMLInputElement>('#contenu input[type="search"]')?.focus();
}

/**
 * Barre d'onglets flottante (< 1 056 px) : pastille de 64 px en matériau, quatre onglets et un
 * bouton Recherche détaché. Se rétracte quand on descend, revient en remontant ou en bout de page ;
 * masquée quand le clavier est ouvert. Nouveau toucher sur l'onglet actif : retour en haut.
 */
export function TabBar({ locale }: { locale: Locale }) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const { feedback } = usePreferences();
  const compact = useScroll((s) => s.direction === 'down' && !s.atTop && !s.atBottom);
  const keyboard = useKeyboardOpen();
  const items = tabs(locale);
  const index = items.findIndex((tab) => tab.active(pathname));
  const searchActive = under(routes.search(locale))(pathname);
  useTabScrollMemory(items.map((tab) => tab.href));

  const onTab = (event: MouseEvent, tab: Tab, active: boolean) => {
    if (active) {
      event.preventDefault();
      scrollToTop();
      return;
    }
    restoreTabScroll(tab.href);
    feedback('tap');
  };

  return (
    <nav
      aria-label={t('mainNav')}
      style={{ viewTransitionName: 'ecine-tabbar' }}
      data-compact={compact ? '' : undefined}
      data-hidden={keyboard ? '' : undefined}
      className="group/tabbar fixed inset-x-3 bottom-[var(--tabbar-offset)] z-30 flex items-center justify-center gap-2 transition-[translate,opacity] duration-[var(--dur-base)] ease-[var(--ease-standard)] data-[hidden]:pointer-events-none data-[hidden]:translate-y-[calc(100%+var(--tabbar-offset))] data-[hidden]:opacity-0 lg:hidden"
    >
      <div className="chrome relative h-[var(--tabbar-h)] min-w-0 flex-1 rounded-full md:w-[400px] md:flex-none">
        {index >= 0 ? (
          <span
            aria-hidden="true"
            className="absolute inset-y-1.5 left-1.5 w-[calc((100%-12px)/4)] rounded-full bg-surface-2/80 transition-[translate] duration-[var(--spring-smooth-dur)] ease-[var(--spring-smooth)]"
            style={{ translate: `${index * 100}% 0` }}
          />
        ) : null}
        <ul className="relative grid h-full grid-cols-4 px-1.5">
          {items.map((tab, i) => {
            const active = i === index;
            return (
              <li key={tab.key}>
                <Link
                  href={tab.href}
                  transitionTypes={['tab']}
                  aria-current={active ? 'page' : undefined}
                  onClick={(event) => onTab(event, tab, active)}
                  className={`flex h-full flex-col items-center justify-center ${active ? 'text-accent-text' : 'text-muted'}`}
                >
                  <span className="flex flex-col items-center gap-0.5 transition-[scale] duration-[var(--dur-base)] ease-[var(--ease-standard)] group-data-[compact]/tabbar:scale-[0.85]">
                    <Icon name={tab.icon} size={24} filled={active} />
                    <span className="text-[11px] font-semibold leading-[13px] transition-opacity duration-[var(--dur-base)] group-data-[compact]/tabbar:opacity-0">
                      {t(tab.key)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <Link
        href={routes.search(locale)}
        transitionTypes={['tab']}
        aria-label={t('search')}
        aria-current={searchActive ? 'page' : undefined}
        onClick={(event) => {
          if (searchActive) {
            event.preventDefault();
            focusSearchField();
          } else {
            feedback('tap');
          }
        }}
        className={`chrome grid size-14 shrink-0 place-items-center rounded-full transition-[scale] duration-[var(--dur-base)] ease-[var(--ease-standard)] group-data-[compact]/tabbar:scale-[0.857] ${searchActive ? 'text-accent-text' : 'text-text'}`}
      >
        <Icon name="search" size={24} filled={searchActive} />
      </Link>
    </nav>
  );
}

/** Initiales du nom affiché (avatar de la navigation PC). */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Navigation haute sur PC (≥ 1 056 px) : transparente en haut de page, matériau après 24 px.
 * Logo, six destinations, champ de recherche qui s'élargit au focus, avatar Moi.
 */
export function TopNav({ locale }: { locale: Locale }) {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const ts = useTranslations('search');
  const pathname = usePathname();
  const material = useScroll((s) => s.y > 24);
  const { viewer } = useAuth();
  const links: Array<{
    key: TabKey | 'films' | 'shorts' | 'people';
    href: string;
    active: (pathname: string) => boolean;
  }> = [
    ...tabs(locale).slice(0, 3),
    { key: 'films', href: routes.films(locale), active: under(routes.films(locale)) },
    { key: 'shorts', href: routes.shorts(locale), active: under(routes.shorts(locale)) },
    { key: 'people', href: routes.people(locale), active: under(routes.people(locale)) },
  ];

  return (
    <header
      style={{ viewTransitionName: 'ecine-topnav' }}
      className="fixed inset-x-0 top-0 z-30 hidden h-[var(--topnav-h)] lg:block"
    >
      <div
        aria-hidden="true"
        className={`chrome-bar absolute inset-0 transition-opacity duration-[var(--dur-base)] ease-[var(--ease-standard)] ${material ? 'opacity-100' : 'opacity-0'}`}
      />
      <nav
        aria-label={t('mainNav')}
        className="container-page relative flex h-full items-center gap-6"
      >
        <Link href={routes.home(locale)} aria-label={t('homeLink')} className="shrink-0">
          <Logo withBadge={false} className="h-8 w-auto" />
        </Link>
        <ul className="flex items-center gap-1">
          {links.map((link) => {
            const active = link.active(pathname);
            return (
              <li key={link.key}>
                <Link
                  href={link.href}
                  transitionTypes={['tab']}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-11 items-center rounded-full px-3 text-[15px] font-semibold ${active ? 'bg-surface-2/80 text-text' : 'text-muted hover:text-text'}`}
                >
                  {t(link.key)}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="ml-auto flex items-center gap-3">
          <form role="search" action={routes.search(locale)} className="w-56 focus-within:w-80">
            <SearchField
              name="q"
              label={ts('label')}
              clearLabel={tc('clear')}
              placeholder={t('search')}
              className="w-full"
            />
          </form>
          <Link
            href={routes.me(locale)}
            aria-label={t('me')}
            aria-current={under(routes.me(locale))(pathname) ? 'page' : undefined}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-semibold text-text"
          >
            {viewer ? (
              <span aria-hidden="true">{initials(viewer.displayName)}</span>
            ) : (
              <Icon name="user" size={22} />
            )}
          </Link>
        </div>
      </nav>
    </header>
  );
}

/** Pastilles de l'accueil (Films, Courts-métrages, Catégories) : accès aux catalogues sur mobile. */
function HomePills({ locale, categories }: { locale: Locale; categories: Category[] }) {
  const t = useTranslations('nav');
  const [open, setOpen] = useState(false);
  return (
    <div className="no-scrollbar relative flex gap-2 overflow-x-auto px-4 pb-3">
      <PillLink href={routes.films(locale)} transitionTypes={['push']}>
        {t('films')}
      </PillLink>
      <PillLink href={routes.shorts(locale)} transitionTypes={['push']}>
        {t('shorts')}
      </PillLink>
      {categories.length > 0 ? (
        <>
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setOpen(true)}
            className={pillClasses()}
          >
            {t('categories')}
            <Icon name="chevronDown" size={16} />
          </button>
          <Sheet open={open} onOpenChange={setOpen} title={t('categories')}>
            <ul className="flex flex-col">
              {categories.map((category) => (
                <li key={category.slug}>
                  <SheetLink
                    href={routes.category(locale, category.slug)}
                    className="flex min-h-11 items-center justify-between border-b border-border text-[15px]"
                  >
                    {category.name}
                    <Icon name="chevronRight" size={20} className="text-muted" />
                  </SheetLink>
                </li>
              ))}
            </ul>
          </Sheet>
        </>
      ) : null}
    </div>
  );
}

/**
 * En-tête mobile et tablette (< 1 056 px), 56 px : symbole du logo, grand titre réduit des écrans
 * de premier niveau, pastilles sur l'accueil. Glisse hors de l'écran quand on descend au-delà de
 * 56 px, revient au moindre défilement vers le haut ; matériau après 24 px.
 */
export function AppHeader({ locale, categories }: { locale: Locale; categories: Category[] }) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const hidden = useScroll((s) => s.direction === 'down' && s.y > 56);
  const material = useScroll((s) => s.y > 24);
  const title = useHeaderTitle();
  return (
    <header
      style={{ viewTransitionName: 'ecine-header' }}
      data-hidden={hidden ? '' : undefined}
      className="sticky top-0 z-30 pt-[env(safe-area-inset-top)] transition-[translate] duration-[var(--dur-base)] ease-[var(--ease-standard)] data-[hidden]:-translate-y-full lg:hidden"
    >
      <div
        aria-hidden="true"
        className={`chrome-bar absolute inset-0 transition-opacity duration-[var(--dur-base)] ease-[var(--ease-standard)] ${material ? 'opacity-100' : 'opacity-0'}`}
      />
      <div className="relative flex h-[var(--header-h)] items-center px-4">
        <Link href={routes.home(locale)} aria-label={t('homeLink')} className="shrink-0">
          <Logo withBadge={false} className="h-7 w-auto" />
        </Link>
        <p
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-20 truncate text-center text-[17px] font-semibold leading-[22px] transition-opacity duration-[var(--dur-fast)] ${title ? 'opacity-100' : 'opacity-0'}`}
        >
          {title}
        </p>
      </div>
      {pathname === routes.home(locale) ? (
        <HomePills locale={locale} categories={categories} />
      ) : null}
    </header>
  );
}
