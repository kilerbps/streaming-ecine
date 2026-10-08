'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { hasRole, type Role } from '@ecine/contracts';
import { LogoutButton } from '@/components/features/account/logout-button';
import { usePreferences } from '@/components/providers/preferences';
import { Icon, type IconName } from '@/components/ui/icon';
import { Logo } from '@/components/ui/logo';
import { Sheet } from '@/components/ui/sheet';
import { SCREEN_ROLE } from './config';
import { USER_ROLE_LABELS } from './labels';

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  role: Role;
  exact?: boolean;
}

/** Navigation par sections ; une entrée n'apparaît que si le rôle permet d'ouvrir l'écran. */
const SECTIONS: Array<{ title: string | null; items: NavItem[] }> = [
  {
    title: null,
    items: [
      {
        href: '/admin',
        label: 'Tableau de bord',
        icon: 'dashboard',
        role: SCREEN_ROLE.dashboard,
        exact: true,
      },
    ],
  },
  {
    title: 'Contenu',
    items: [
      { href: '/admin/films', label: 'Films', icon: 'film', role: SCREEN_ROLE.content },
      { href: '/admin/people', label: 'Personnes', icon: 'user', role: SCREEN_ROLE.content },
      { href: '/admin/actualites', label: 'Actualités', icon: 'news', role: SCREEN_ROLE.content },
      {
        href: '/admin/publications',
        label: 'Publications',
        icon: 'image',
        role: SCREEN_ROLE.content,
      },
      { href: '/admin/categories', label: 'Catégories', icon: 'tag', role: SCREEN_ROLE.content },
    ],
  },
  {
    title: 'Communauté',
    items: [
      {
        href: '/admin/signalements',
        label: 'Signalements',
        icon: 'flag',
        role: SCREEN_ROLE.reports,
      },
      { href: '/admin/messages', label: 'Messages', icon: 'mail', role: SCREEN_ROLE.messages },
      {
        href: '/admin/utilisateurs',
        label: 'Utilisateurs',
        icon: 'shield',
        role: SCREEN_ROLE.users,
      },
    ],
  },
  {
    title: 'Site',
    items: [
      { href: '/admin/equipe', label: 'Équipe', icon: 'users', role: SCREEN_ROLE.content },
      { href: '/admin/pages', label: 'Pages', icon: 'document', role: SCREEN_ROLE.content },
      {
        href: '/admin/redirections',
        label: 'Redirections',
        icon: 'redirect',
        role: SCREEN_ROLE.content,
      },
      {
        href: '/admin/parametres',
        label: 'Paramètres',
        icon: 'settings',
        role: SCREEN_ROLE.settings,
      },
    ],
  },
  {
    title: 'Suivi',
    items: [
      {
        href: '/admin/statistiques',
        label: 'Statistiques',
        icon: 'chart',
        role: SCREEN_ROLE.stats,
      },
      { href: '/admin/journal', label: 'Journal', icon: 'list', role: SCREEN_ROLE.audit },
    ],
  },
];

function sectionsFor(role: Role, locked: boolean) {
  if (locked) return SECTIONS.slice(0, 1);
  return SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((i) => hasRole(role, i.role)),
  })).filter((s) => s.items.length > 0);
}

function isActive(pathname: string, item: NavItem): boolean {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** auto : rail sur tablette, menu complet sur PC · rail / full : choix de l'utilisateur. */
type RailMode = 'auto' | 'rail' | 'full';

const ASIDE_WIDTH: Record<RailMode, string> = {
  auto: 'md:w-16 lg:w-60',
  rail: 'md:w-16',
  full: 'md:w-60',
};
const LABEL: Record<RailMode, string> = {
  auto: 'sr-only lg:not-sr-only',
  rail: 'sr-only',
  full: '',
};
const SECTION_TITLE: Record<RailMode, string> = {
  auto: 'hidden lg:block',
  rail: 'hidden',
  full: 'block',
};
const CONTENT_PAD: Record<RailMode, string> = {
  auto: 'md:pl-16 lg:pl-60',
  rail: 'md:pl-16',
  full: 'md:pl-16 lg:pl-60',
};

function NavList({
  role,
  locked,
  mode,
  onNavigate,
}: {
  role: Role;
  locked: boolean;
  mode: RailMode;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label="Administration" className="flex-1 overflow-y-auto py-2">
      {sectionsFor(role, locked).map((section, index) => (
        <div key={section.title ?? index} className="mb-2">
          {section.title ? (
            <p className={`eyebrow px-5 pt-4 pb-2 text-muted ${SECTION_TITLE[mode]}`}>
              {section.title}
            </p>
          ) : null}
          {section.title && mode !== 'full' ? (
            <div
              className={`mx-3 mt-3 border-t border-border ${mode === 'auto' ? 'lg:hidden' : ''}`}
              aria-hidden="true"
            />
          ) : null}
          <ul>
            {section.items.map((item) => {
              const active = isActive(pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    title={item.label}
                    aria-current={active ? 'page' : undefined}
                    className={`flex min-h-11 items-center gap-3 border-l-2 px-5 text-sm ${
                      active
                        ? 'border-accent bg-surface-1 text-accent-text'
                        : 'border-transparent text-muted hover:bg-surface-1 hover:text-text'
                    }`}
                  >
                    <Icon name={item.icon} size={20} className="shrink-0" />
                    <span className={LABEL[mode]}>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/**
 * Cadre de l'administration : menu latéral par sections (repliable sur tablette, feuille sur mobile),
 * barre supérieure avec « Voir le site », thème, utilisateur et déconnexion.
 */
const THEME_CYCLE = { dark: 'light', light: 'auto', auto: 'dark' } as const;
const THEME_LABELS = { dark: 'Nuit', light: 'Jour', auto: 'Automatique' } as const;
const THEME_ICONS = { dark: 'moon', light: 'sun', auto: 'settings' } as const;

/** Thème de l'administration : Nuit, Jour ou Automatique (réglage partagé avec le site, D-09). */
function ThemeButton() {
  const { theme, setTheme } = usePreferences();
  return (
    <button
      type="button"
      onClick={() => setTheme(THEME_CYCLE[theme])}
      aria-label={`Thème : ${THEME_LABELS[theme]}. Passer à ${THEME_LABELS[THEME_CYCLE[theme]]}`}
      title={`Thème : ${THEME_LABELS[theme]}`}
      className="press-icon grid size-11 place-items-center rounded-full text-text hover:bg-surface-2"
    >
      <Icon name={THEME_ICONS[theme]} />
    </button>
  );
}

export function AdminShell({
  viewer,
  locked = false,
  children,
}: {
  viewer: { displayName: string; role: Role };
  /** Navigation réduite (double authentification manquante : aucun écran n'est accessible). */
  locked?: boolean;
  children: ReactNode;
}) {
  const [mode, setMode] = useState<RailMode>('auto');
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleRail = () => {
    const wide = window.matchMedia('(min-width: 66rem)').matches;
    const showingFull = mode === 'full' || (mode === 'auto' && wide);
    setMode(showingFull ? 'rail' : 'full');
  };
  // Sur tablette, le menu déplié recouvre le contenu : il se replie après un choix.
  const collapseAfterNavigate = () => {
    if (mode === 'full' && !window.matchMedia('(min-width: 66rem)').matches) setMode('auto');
  };
  const expanded = mode === 'full';

  return (
    <div className="min-h-dvh bg-bg">
      <a
        href="#admin-contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent"
      >
        Aller au contenu
      </a>

      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-bg md:flex ${ASIDE_WIDTH[mode]}`}
      >
        <Link
          href="/admin"
          className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4"
          aria-label="Administration E-Ciné, tableau de bord"
        >
          <Logo withBadge={false} className="h-7 w-auto shrink-0" />
          <span className={`eyebrow text-muted ${LABEL[mode]}`}>Admin</span>
        </Link>
        <NavList
          role={viewer.role}
          locked={locked}
          mode={mode}
          onNavigate={collapseAfterNavigate}
        />
        <button
          type="button"
          onClick={toggleRail}
          aria-label={expanded ? 'Replier le menu' : 'Déplier ou replier le menu'}
          className="flex min-h-11 items-center gap-3 border-t border-border px-5 text-sm text-muted hover:bg-surface-1 hover:text-text"
        >
          <Icon
            name={mode === 'rail' ? 'chevronRight' : mode === 'full' ? 'chevronLeft' : 'menu'}
            size={20}
            className="shrink-0"
          />
          <span className={LABEL[mode]}>Replier le menu</span>
        </button>
      </aside>

      <div className={CONTENT_PAD[mode]}>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-bg px-2 md:px-6">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Ouvrir le menu d’administration"
            className="grid size-11 place-items-center hover:bg-surface-2 md:hidden"
          >
            <Icon name="menu" />
          </button>
          <Link href="/admin" className="font-serif text-lg md:hidden">
            Administration
          </Link>
          <div className="ml-auto flex min-w-0 items-center gap-1">
            <Link
              href="/fr"
              className="hidden min-h-11 items-center gap-2 px-3 text-sm text-muted hover:bg-surface-2 hover:text-text md:inline-flex"
            >
              <Icon name="external" size={18} />
              Voir le site
            </Link>
            <ThemeButton />
            <span className="hidden max-w-48 flex-col px-3 text-right leading-tight lg:flex">
              <span className="truncate text-sm">{viewer.displayName}</span>
              <span className="meta">{USER_ROLE_LABELS[viewer.role]}</span>
            </span>
            {/* Sur mobile, la déconnexion est dans le menu (place limitée). */}
            <div className="hidden md:block">
              <LogoutButton />
            </div>
          </div>
        </header>
        <main
          id="admin-contenu"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1400px] px-4 py-6 focus:outline-none md:px-8 md:py-8"
        >
          {children}
        </main>
      </div>

      <Sheet
        open={menuOpen}
        onOpenChange={setMenuOpen}
        title="Administration"
        description={`${viewer.displayName} · ${USER_ROLE_LABELS[viewer.role]}`}
      >
        <div className="-mx-6 flex flex-col">
          <NavList
            role={viewer.role}
            locked={locked}
            mode="full"
            onNavigate={() => setMenuOpen(false)}
          />
          <div className="mx-6 mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <Link
              href="/fr"
              className="inline-flex min-h-11 items-center gap-2 text-sm text-muted hover:text-text"
            >
              <Icon name="external" size={18} />
              Voir le site
            </Link>
            <LogoutButton />
          </div>
        </div>
      </Sheet>
    </div>
  );
}
