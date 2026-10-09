'use client';

import { useSyncExternalStore } from 'react';

/**
 * Installation de l'application (docs/design/03-experience-native.md, Application installable) :
 * l'invite arrive après une preuve de valeur (2e visite, ou juste après un film terminé), une fois
 * par période de 30 jours au plus. Compteurs gardés dans le navigateur (confort, rien de sensible).
 */
export const FILM_COMPLETE_EVENT = 'ecine:film-complete';

const VISITS_KEY = 'ecine:visits';
const VISIT_COUNTED_KEY = 'ecine:visit-counted';
const LAST_OFFER_KEY = 'ecine:install-offered-at';
const OFFER_EVERY_MS = 30 * 24 * 60 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface InstallState {
  /** Déjà ouverte comme une app (écran d'accueil). */
  installed: boolean;
  /** Android et Chromium : l'invite native est disponible. */
  canPrompt: boolean;
  /** Safari sur iPhone ou iPad : installation par le bouton Partager. */
  ios: boolean;
}

const SERVER_STATE: InstallState = { installed: false, canPrompt: false, ios: false };
let deferred: BeforeInstallPromptEvent | null = null;
let state: InstallState = SERVER_STATE;
let listening = false;
const listeners = new Set<() => void>();

function compute(): InstallState {
  const nav = navigator as Navigator & { standalone?: boolean };
  const installed =
    window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
  const ios =
    /iPhone|iPad|iPod/.test(nav.userAgent) ||
    (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  return { installed, canPrompt: deferred !== null, ios: ios && !installed };
}

function refresh(): void {
  const next = compute();
  if (
    next.installed !== state.installed ||
    next.canPrompt !== state.canPrompt ||
    next.ios !== state.ios
  ) {
    state = next;
    for (const listener of listeners) listener();
  }
}

function listen(): void {
  if (listening) return;
  listening = true;
  state = compute();
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    refresh();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    refresh();
  });
}

function subscribe(listener: () => void): () => void {
  listen();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );
}

/** Ouvre l'invite native ; vrai si la personne a accepté. */
export async function promptInstall(): Promise<boolean> {
  const event = deferred;
  if (!event) return false;
  deferred = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  refresh();
  return outcome === 'accepted';
}

function readNumber(storage: Storage, key: string): number {
  return Number(storage.getItem(key) ?? 0) || 0;
}

/** Compte une visite par session de navigation ; renvoie le nombre de visites. */
export function countVisit(): number {
  try {
    const visits = readNumber(localStorage, VISITS_KEY);
    if (sessionStorage.getItem(VISIT_COUNTED_KEY)) return visits;
    sessionStorage.setItem(VISIT_COUNTED_KEY, '1');
    localStorage.setItem(VISITS_KEY, String(visits + 1));
    return visits + 1;
  } catch {
    return 0;
  }
}

/** Invite déjà proposée depuis moins de 30 jours. */
export function offeredRecently(now = Date.now()): boolean {
  try {
    return now - readNumber(localStorage, LAST_OFFER_KEY) < OFFER_EVERY_MS;
  } catch {
    return true;
  }
}

export function markOffered(now = Date.now()): void {
  try {
    localStorage.setItem(LAST_OFFER_KEY, String(now));
  } catch {
    // Stockage indisponible : l'invite pourra revenir, sans conséquence.
  }
}
