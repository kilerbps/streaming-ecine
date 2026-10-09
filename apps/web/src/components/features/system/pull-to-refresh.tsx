'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Icon } from '@/components/ui/icon';
import { Loader } from '@/components/ui/loader';
import { vibrate } from '@/lib/haptics';

/** Seuil de déclenchement (charte : 72 px), course maximale et résistance du doigt. */
const THRESHOLD = 72;
const MAX_PULL = 112;
const RESISTANCE = 0.5;
const REST = -64;

/**
 * Tirer pour rafraîchir (accueil, Nouveautés). Le rafraîchissement natif du navigateur reste coupé
 * (`overscroll-behavior-y: none`) pour n'en avoir qu'un. Écouteurs passifs : le défilement n'est
 * jamais retenu. En haut de page, tirer vers le bas fait descendre une pastille ; au-delà de 72 px,
 * une vibration, puis au lâcher la page est recalculée par le serveur (`router.refresh`).
 */
export function PullToRefresh() {
  const router = useRouter();
  const t = useTranslations('common');
  const [pending, startTransition] = useTransition();
  const [armed, setArmed] = useState(false);
  const pill = useRef<HTMLDivElement>(null);
  const refreshing = useRef(false);

  useEffect(() => {
    refreshing.current = pending;
    const node = pill.current;
    if (!node || pending) return;
    node.style.transition = '';
    node.style.transform = '';
    node.style.opacity = '';
  }, [pending]);

  useEffect(() => {
    let start: { x: number; y: number } | null = null;
    let distance = 0;
    let crossed = false;

    const place = (offset: number) => {
      const node = pill.current;
      if (!node) return;
      node.style.transform = `translateY(${REST + offset}px)`;
      node.style.opacity = String(Math.min(1, offset / THRESHOLD));
    };

    const onStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      const busy = refreshing.current || document.querySelector('[role="dialog"]');
      if (!touch || event.touches.length > 1 || window.scrollY > 0 || busy) return;
      start = { x: touch.clientX, y: touch.clientY };
      distance = 0;
      crossed = false;
      if (pill.current) pill.current.style.transition = 'none';
    };

    const onMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!start || !touch) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      // Geste horizontal (rangée, affiche à la une) ou vers le haut : ce n'est pas pour nous.
      if (distance === 0 && (Math.abs(dx) > Math.abs(dy) || dy < 0)) {
        start = null;
        return;
      }
      distance = Math.min(MAX_PULL, Math.max(0, dy * RESISTANCE));
      place(distance);
      const over = distance >= THRESHOLD;
      if (over !== crossed) {
        crossed = over;
        setArmed(over);
        if (over) vibrate('refresh');
      }
    };

    const onEnd = () => {
      if (!start) return;
      start = null;
      const node = pill.current;
      if (node) node.style.transition = '';
      setArmed(false);
      if (distance >= THRESHOLD) {
        place(THRESHOLD);
        startTransition(() => router.refresh());
      } else if (node) {
        node.style.transform = '';
        node.style.opacity = '';
      }
      distance = 0;
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, [router]);

  return (
    <div
      ref={pill}
      aria-hidden={pending ? undefined : 'true'}
      className="pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+16px)] z-40 -ml-6 grid size-12 [transform:translateY(-64px)] place-items-center rounded-full bg-surface-3 opacity-0 shadow-[var(--shadow-menu)] transition-[transform,opacity] duration-[var(--dur-base)] ease-[var(--ease-standard)] lg:hidden"
    >
      {pending ? (
        <Loader size="sm" label={t('loading')} />
      ) : (
        <Icon
          name="arrowDown"
          size={22}
          className={`text-text transition-transform duration-[var(--dur-fast)] ${armed ? 'rotate-180' : ''}`}
        />
      )}
    </div>
  );
}
