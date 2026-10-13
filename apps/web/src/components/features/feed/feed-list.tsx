'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FeedItem, Locale } from '@ecine/contracts';
import { useToast } from '@/components/providers/toast';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { Illustration } from '@/components/ui/illustration';
import { loadFeedPageAction } from '@/server/actions/interactions';
import { ArticleCard, FilmCard, PostCard } from './feed-cards';

/** Pause douce (garde-fou éthique) : après 3 chargements automatiques, on demande avant de continuer. */
const AUTO_PAGES_BEFORE_PAUSE = 3;
const POSITION_KEY = 'ecine:feed-position';
const POSITION_TTL_MS = 30 * 60 * 1000;

interface SavedPosition {
  pages: number;
  scrollY: number;
  savedAt: number;
}

function readPosition(): SavedPosition | null {
  try {
    const raw = sessionStorage.getItem(POSITION_KEY);
    const parsed = raw ? (JSON.parse(raw) as SavedPosition) : null;
    return parsed && Date.now() - parsed.savedAt < POSITION_TTL_MS ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Feed infini : la page suivante est servie par une Server Action (curseur opaque), jamais par un
 * fetch client. La position (nombre de pages, défilement) est mémorisée pour le retour arrière.
 */
export function FeedList({
  locale,
  initialItems,
  initialCursor,
  initialLikedPosts,
}: {
  locale: Locale;
  initialItems: FeedItem[];
  initialCursor: string | null;
  initialLikedPosts: string[];
}) {
  const t = useTranslations('feed');
  const tc = useTranslations('common');
  const toast = useToast();
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [liked, setLiked] = useState(() => new Set(initialLikedPosts));
  const [loading, setLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [pagesLoaded, setPagesLoaded] = useState(1);
  const [pausedAt, setPausedAt] = useState(AUTO_PAGES_BEFORE_PAUSE);
  const sentinel = useRef<HTMLDivElement>(null);
  const restoring = useRef<SavedPosition | null>(null);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    // Loader seulement si l'attente dépasse ~300 ms (docs/05 §7).
    const timer = window.setTimeout(() => setShowLoader(true), 300);
    const result = await loadFeedPageAction(cursor);
    window.clearTimeout(timer);
    setShowLoader(false);
    setLoading(false);
    if (!result.ok) {
      toast(result.error, 'error');
      return;
    }
    const known = new Set(items.map((i) => i.key));
    setItems((prev) => [...prev, ...result.data.page.items.filter((i) => !known.has(i.key))]);
    setLiked((prev) => new Set([...prev, ...result.data.likedPosts]));
    setCursor(result.data.page.nextCursor);
    setPagesLoaded((n) => n + 1);
  }, [cursor, loading, items, toast]);

  const autoAllowed = pagesLoaded < pausedAt;

  // Chargement automatique à l'approche de la fin de liste.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor || !autoAllowed) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      { rootMargin: '800px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, autoAllowed, loadMore]);

  // Restauration de la position au retour sur le feed.
  useEffect(() => {
    restoring.current = readPosition();
  }, []);
  useEffect(() => {
    const target = restoring.current;
    if (!target) return;
    if (pagesLoaded < target.pages && cursor && !loading) {
      void loadMore();
    } else if (pagesLoaded >= target.pages || !cursor) {
      restoring.current = null;
      window.scrollTo({ top: target.scrollY });
    }
  }, [pagesLoaded, cursor, loading, loadMore]);

  // Mémorisation de la position (défilement limité à une écriture toutes les 500 ms).
  useEffect(() => {
    let last = 0;
    const save = () => {
      const now = Date.now();
      if (now - last < 500) return;
      last = now;
      try {
        sessionStorage.setItem(
          POSITION_KEY,
          JSON.stringify({ pages: pagesLoaded, scrollY: window.scrollY, savedAt: now }),
        );
      } catch {
        // Stockage indisponible (navigation privée) : sans conséquence.
      }
    };
    window.addEventListener('scroll', save, { passive: true });
    return () => window.removeEventListener('scroll', save);
  }, [pagesLoaded]);

  if (items.length === 0) return <EmptyState title={t('empty')} />;

  return (
    <div>
      <ol className="flex flex-col">
        {items.map((item, index) => (
          // Cartes hors écran ignorées par la mise en page (défilement, ouverture d'une feuille).
          <li
            key={item.key}
            className="py-8 [contain-intrinsic-size:auto_640px] [content-visibility:auto] first:pt-2 md:py-12"
          >
            {item.type === 'film' ? (
              <FilmCard item={item} locale={locale} eager={index === 0} />
            ) : null}
            {item.type === 'post' ? (
              <PostCard item={item} liked={liked.has(item.post.id)} locale={locale} />
            ) : null}
            {item.type === 'article' ? <ArticleCard item={item} locale={locale} /> : null}
          </li>
        ))}
      </ol>
      <div ref={sentinel} aria-hidden="true" />
      {showLoader ? (
        <div className="flex justify-center py-10">
          <Loader label={t('loadingMore')} />
        </div>
      ) : null}
      {cursor && !autoAllowed && !loading ? (
        <section className="my-12 rounded-lg bg-surface-1 p-6 text-center">
          <h2 className="text-xl leading-[25px]">{t('pauseTitle')}</h2>
          <p className="mx-auto mt-2 max-w-md text-[15px] leading-5 text-muted">{t('pauseBody')}</p>
          <Button
            className="mt-5"
            variant="secondary"
            onClick={() => {
              setPausedAt(pagesLoaded + AUTO_PAGES_BEFORE_PAUSE);
              void loadMore();
            }}
          >
            {t('pauseContinue')}
          </Button>
        </section>
      ) : null}
      {!cursor ? (
        <div className="flex flex-col items-center py-12">
          <Illustration variant="empty" className="h-auto w-24" />
          <p className="mt-4 text-center text-muted">{tc('endOfList')}</p>
        </div>
      ) : null}
    </div>
  );
}
