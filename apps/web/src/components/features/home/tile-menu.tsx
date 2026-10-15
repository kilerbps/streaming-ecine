'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Image as ImageData } from '@ecine/contracts';
import { useAuth } from '@/components/providers/auth';
import { usePreferences } from '@/components/providers/preferences';
import { useToast } from '@/components/providers/toast';
import { ContextMenu, type MenuItem } from '@/components/ui/context-menu';
import { MediaImage } from '@/components/ui/media-image';
import { track } from '@/lib/analytics';
import { setBookmarkAction } from '@/server/actions/interactions';
import { dismissFilmAction } from '@/server/actions/personalization';

interface HomeMenuState {
  /** « Pas pour moi » possible : membre, ou visiteur ayant accepté « Personnalisation ». */
  canDismiss: boolean;
  hidden: Set<string>;
  bookmarked: Set<string>;
  setHidden: (filmId: string, hidden: boolean) => void;
  setBookmarked: (filmId: string, saved: boolean) => void;
}

const HomeMenuContext = createContext<HomeMenuState | null>(null);

/** État partagé des tuiles de l'accueil : titres masqués à l'instant et Ma liste du membre. */
export function HomeMenuProvider({
  canDismiss,
  bookmarkedIds,
  children,
}: {
  canDismiss: boolean;
  bookmarkedIds: string[];
  children: ReactNode;
}) {
  const [hidden, setHiddenSet] = useState<Set<string>>(() => new Set());
  const [bookmarked, setBookmarkedSet] = useState<Set<string>>(() => new Set(bookmarkedIds));
  const toggle = (set: Set<string>, id: string, on: boolean) => {
    const next = new Set(set);
    if (on) next.add(id);
    else next.delete(id);
    return next;
  };
  return (
    <HomeMenuContext.Provider
      value={{
        canDismiss,
        hidden,
        bookmarked,
        setHidden: (id, on) => setHiddenSet((set) => toggle(set, id, on)),
        setBookmarked: (id, on) => setBookmarkedSet((set) => toggle(set, id, on)),
      }}
    >
      {children}
    </HomeMenuContext.Provider>
  );
}

/**
 * Menu contextuel d'une affiche de l'accueil (appui long de 500 ms ou clic droit) : affiche agrandie
 * puis Ma liste, Partager, Pas pour moi, Voir la fiche. « Pas pour moi » masque la tuile tout de suite
 * et propose « Annuler » pendant 6 s.
 */
export function TileMenu({
  film,
  href,
  children,
}: {
  film: { id: string; slug: string; title: string; poster: ImageData | null };
  href: string;
  children: ReactNode;
}) {
  const t = useTranslations('home.menu');
  const ta = useTranslations('actions');
  const state = useContext(HomeMenuContext);
  const router = useRouter();
  const toast = useToast();
  const { feedback } = usePreferences();
  const { requireAuth, sessionExpired } = useAuth();
  if (!state) return children;
  if (state.hidden.has(film.id)) return null;
  const saved = state.bookmarked.has(film.id);

  const toggleBookmark = async (next: boolean) => {
    state.setBookmarked(film.id, next);
    const result = await setBookmarkAction(film.id, next);
    if (result.ok) {
      feedback(next ? 'bookmark' : 'tap');
      toast(next ? ta('inList') : ta('unbookmark'), 'success');
      if (next) track({ type: 'list_add', targetType: 'FILM', targetId: film.id });
      return;
    }
    state.setBookmarked(film.id, !next);
    if (result.code === 'auth') sessionExpired(() => toggleBookmark(next));
    else toast(result.error, 'error');
  };

  const dismiss = async (hidden: boolean) => {
    state.setHidden(film.id, hidden);
    const result = await dismissFilmAction(film.id, hidden);
    if (!result.ok) {
      state.setHidden(film.id, !hidden);
      toast(result.error, 'error');
      return;
    }
    if (hidden) {
      toast(t('dismissed'), 'info', { label: t('undo'), onAction: () => void dismiss(false) });
    }
  };

  const share = async () => {
    const url = new URL(href, window.location.origin).toString();
    if (navigator.share) {
      await navigator.share({ title: film.title, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(url);
    toast(t('copied'), 'success');
  };

  const items: MenuItem[] = [
    {
      key: 'list',
      label: saved ? ta('unbookmark') : ta('bookmark'),
      icon: 'bookmark',
      onSelect: () => requireAuth(() => toggleBookmark(!saved), 'list'),
    },
    { key: 'share', label: t('share'), icon: 'share', onSelect: () => void share() },
    ...(state.canDismiss
      ? [
          {
            key: 'dismiss',
            label: t('notForMe'),
            icon: 'eyeOff' as const,
            onSelect: () => void dismiss(true),
          },
        ]
      : []),
    { key: 'open', label: t('open'), icon: 'film', onSelect: () => router.push(href) },
  ];

  return (
    <ContextMenu
      contents
      items={items}
      preview={
        <div className="w-28">
          <MediaImage image={film.poster} ratio="2/3" sizes="112px" className="rounded-sm" />
        </div>
      }
    >
      {children}
    </ContextMenu>
  );
}
