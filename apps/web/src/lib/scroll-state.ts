'use client';

import { useSyncExternalStore } from 'react';

/**
 * État du défilement de la fenêtre, partagé par l'en-tête et la barre d'onglets : un seul écouteur
 * passif, lu une fois par image (requestAnimationFrame). La direction ne change qu'au-delà de 4 px
 * pour ignorer les tremblements du doigt (charte, En-tête et défilement).
 */
export interface ScrollState {
  y: number;
  direction: 'up' | 'down';
  atTop: boolean;
  atBottom: boolean;
}

const INITIAL: ScrollState = { y: 0, direction: 'up', atTop: true, atBottom: false };
const DIRECTION_THRESHOLD = 4;
const EDGE = 8;

let state = INITIAL;
let anchorY = 0;
let frame = 0;
const listeners = new Set<() => void>();

function update(): void {
  frame = 0;
  const y = Math.max(0, window.scrollY);
  const max = document.documentElement.scrollHeight - window.innerHeight;
  let direction = state.direction;
  if (Math.abs(y - anchorY) >= DIRECTION_THRESHOLD) {
    direction = y > anchorY ? 'down' : 'up';
    anchorY = y;
  }
  const next: ScrollState = {
    y,
    direction,
    atTop: y <= EDGE,
    atBottom: max > 0 && y >= max - EDGE,
  };
  if (
    next.y !== state.y ||
    next.direction !== state.direction ||
    next.atTop !== state.atTop ||
    next.atBottom !== state.atBottom
  ) {
    state = next;
    for (const listener of listeners) listener();
  }
}

function onScroll(): void {
  if (!frame) frame = window.requestAnimationFrame(update);
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    anchorY = window.scrollY;
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    }
  };
}

/** Valeur dérivée du défilement ; `select` doit renvoyer une valeur simple (booléen, nombre). */
export function useScroll<T>(select: (scroll: ScrollState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => select(state),
    () => select(INITIAL),
  );
}

/** Remonte en haut de la page (nouveau toucher sur l'onglet actif). */
export function scrollToTop(): void {
  const reduce =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.dataset.motion === 'reduce';
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
}
