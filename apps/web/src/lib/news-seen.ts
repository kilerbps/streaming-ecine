'use client';

import { useSyncExternalStore } from 'react';
import { PREFERENCE_COOKIES } from './preferences';

/**
 * Pastille de l'onglet Nouveautés (charte, Barre d'onglets) : rouge, sans chiffre, s'il y a du
 * nouveau depuis la dernière visite de l'écran. La date de cette visite est gardée en cookie et
 * comparée par le serveur à la dernière actualité publiée ; la pastille disparaît dès la visite.
 */
const ONE_YEAR = 60 * 60 * 24 * 365;
let seenThisVisit = false;
const listeners = new Set<() => void>();

function writeSeen(): void {
  const secure = window.location.protocol === 'https:' ? '; secure' : '';
  document.cookie = `${PREFERENCE_COOKIES.newsSeen}=${new Date().toISOString()}; path=/; max-age=${ONE_YEAR}; samesite=lax${secure}`;
}

/** Visite de l'écran : la pastille disparaît tout de suite et la date est notée. */
export function markNewsSeen(): void {
  writeSeen();
  if (seenThisVisit) return;
  seenThisVisit = true;
  for (const listener of listeners) listener();
}

/** Première visite du site : point de départ, pour ne signaler que ce qui arrive ensuite. */
export function ensureNewsBaseline(): void {
  if (!document.cookie.includes(`${PREFERENCE_COOKIES.newsSeen}=`)) writeSeen();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useNewsSeen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => seenThisVisit,
    () => false,
  );
}
