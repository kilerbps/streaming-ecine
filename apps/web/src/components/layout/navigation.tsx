'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { Locale } from '@ecine/contracts';
import { usePreferences } from '@/components/providers/preferences';
import { Icon, type IconName } from '@/components/ui/icon';
import { Logo } from '@/components/ui/logo';
import { routes } from '@/lib/routes';
import { SoundToggle, ThemeToggle } from './toggles';

interface NavItem {
  key: 'home' | 'films' | 'search' | 'news' | 'me' | 'shorts' | 'people' | 'about';
  href: string;
  icon: IconName;
  exact?: boolean;
}

/** 5 onglets maximum en bas sur mobile (loi de Hick). */
function primaryItems(locale: Locale): NavItem[] {
  return [
    { key: 'home', href: routes.home(locale), icon: 'home', exact: true },
    { key: 'films', href: routes.films(locale), icon: 'film' },
    { key: 'search', href: routes.search(locale), icon: 'search' },
    { key: 'news', href: routes.news(locale), icon: 'news' },
    { key: 'me', href: routes.me(locale), icon: 'user' },
  ];
}

function isActive(pathname: string, item: NavItem): boolean {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Barre d'onglets mobile (< 672 px) : application en main, cibles ≥ 44 px, safe-area. */
export function TabBar({ locale }: { locale: Locale }) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const { feedback } = usePreferences();
  return (
    <nav
      aria-label={t('mainNav')}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg safe-bottom md:hidden"
    >
      <ul className="grid h-[var(--tabbar-height)] grid-cols-5">
        {primaryItems(locale).map((item) => {
          const active = isActive(pathname, item);
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                onClick={() => feedback('tap')}
                aria-current={active ? 'page' : undefined}
                className={`flex h-full flex-col items-center justify-center gap-0.5 border-t-2 text-[11px] ${
                  active ? 'border-accent text-accent-text' : 'border-transparent text-muted'
                }`}
              >
                <Icon name={item.icon} size={22} filled={active && item.icon === 'home'} />
                {t(item.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Rail latéral : compact (icônes + libellés courts) sur tablette, élargi sur PC. */
export function SideRail({ locale }: { locale: Locale }) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const items: NavItem[] = [
    ...primaryItems(locale).slice(0, 2),
    { key: 'shorts', href: routes.shorts(locale), icon: 'film' },
    { key: 'people', href: routes.people(locale), icon: 'user' },
    ...primaryItems(locale).slice(2),
  ];
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-24 flex-col border-r border-border bg-bg md:flex lg:w-60">
      <Link
        href={routes.home(locale)}
        className="block px-4 pt-5 pb-6 lg:px-6"
        aria-label="E-Ciné, accueil"
      >
        <Logo className="h-12 w-auto lg:h-14" />
      </Link>
      <nav aria-label={t('mainNav')} className="flex-1">
        <ul className="flex flex-col">
          {items.map((item) => {
            const active = isActive(pathname, item);
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-12 flex-col items-center justify-center gap-1 border-l-2 px-2 text-xs lg:flex-row lg:justify-start lg:gap-4 lg:px-6 lg:text-base ${
                    active
                      ? 'border-accent text-accent-text bg-surface-1'
                      : 'border-transparent text-muted hover:text-text hover:bg-surface-1'
                  }`}
                >
                  <Icon name={item.icon} size={22} />
                  <span className="text-center lg:text-left">{t(item.key)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="flex flex-col items-center gap-1 border-t border-border py-3 lg:flex-row lg:px-4">
        <SoundToggle />
        <ThemeToggle />
      </div>
    </aside>
  );
}

/** En-tête mobile minimal : logo + réglages. */
export function MobileHeader({ locale }: { locale: Locale }) {
  return (
    <header className="sticky top-0 z-30 flex h-[var(--header-height)] items-center justify-between border-b border-border bg-bg px-4 md:hidden">
      <Link href={routes.home(locale)} aria-label="E-Ciné, accueil">
        <Logo className="h-9 w-auto" />
      </Link>
      <div className="flex items-center">
        <SoundToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}
