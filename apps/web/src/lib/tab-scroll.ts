'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Mémoire de défilement de chaque onglet (charte, En-tête et défilement) : en quittant la page
 * racine d'un onglet par un lien, sa position est notée ; en y revenant par la barre d'onglets, elle
 * est rétablie une fois la page rendue. Gardée en `sessionStorage` (confort, rien de sensible).
 */
const PREFIX = 'ecine:scroll:';
const RESTORE_TIMEOUT_MS = 1500;
let pendingRestore: string | null = null;

function save(path: string): void {
  try {
    sessionStorage.setItem(PREFIX + path, String(Math.round(window.scrollY)));
  } catch {
    // Stockage indisponible (navigation privée) : la page s'ouvre simplement en haut.
  }
}

function saved(path: string): number {
  try {
    return Number(sessionStorage.getItem(PREFIX + path) ?? 0) || 0;
  } catch {
    return 0;
  }
}

/** À appeler au toucher d'un onglet : sa position sera rétablie à l'arrivée. */
export function restoreTabScroll(path: string): void {
  pendingRestore = path;
}

export function useTabScrollMemory(tabRoots: readonly string[]): void {
  const pathname = usePathname();
  const isTabRoot = tabRoots.includes(pathname);

  // Départ d'une page racine d'onglet par un lien interne : on note la position.
  useEffect(() => {
    if (!isTabRoot) return;
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a[href^="/"]');
      if (link) save(pathname);
    };
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, [pathname, isTabRoot]);

  // Arrivée par la barre d'onglets : on rétablit la position dès que la page est assez haute.
  useEffect(() => {
    if (pendingRestore !== pathname) return;
    pendingRestore = null;
    const target = saved(pathname);
    if (target <= 0) return;
    const started = performance.now();
    let frame = 0;
    const attempt = () => {
      const reachable = document.documentElement.scrollHeight - window.innerHeight >= target;
      if (reachable || performance.now() - started > RESTORE_TIMEOUT_MS) {
        window.scrollTo({ top: target, behavior: 'auto' });
        return;
      }
      frame = window.requestAnimationFrame(attempt);
    };
    frame = window.requestAnimationFrame(attempt);
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);
}
