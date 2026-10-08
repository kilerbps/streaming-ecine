'use client';

import type { AnalyticsEventInput } from '@ecine/contracts';
import { trackEventAction } from '@/server/actions/forms';

const SESSION_KEY = 'ecine:session';

/**
 * Session de navigation : tirée au hasard, gardée le temps de l'onglet (`sessionStorage`), jamais
 * d'une visite à l'autre. Sert aux indicateurs « par session » du PRD de la refonte.
 * Renvoie `isNew` à la première lecture pour émettre `session_start`.
 */
function readSession(): { id: string | undefined; isNew: boolean } {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return { id: existing, isNew: false };
    const id = crypto.randomUUID().replaceAll('-', '').slice(0, 24);
    sessionStorage.setItem(SESSION_KEY, id);
    return { id, isNew: true };
  } catch {
    // Stockage indisponible (navigation privée stricte) : événement sans session.
    return { id: undefined, isNew: false };
  }
}

/**
 * Envoie un événement de mesure. Le serveur ne le transmet à l'API que si le visiteur a accepté la
 * mesure d'audience ; un échec n'est jamais visible.
 */
export function track(event: Omit<AnalyticsEventInput, 'session'>): void {
  const { id } = readSession();
  void trackEventAction({ ...event, session: id }).catch(() => undefined);
}

/** À appeler une fois par page vue : émet `session_start` au début d'une session. */
export function startSessionIfNeeded(path: string): void {
  const { id, isNew } = readSession();
  if (isNew)
    void trackEventAction({ type: 'session_start', path, session: id }).catch(() => undefined);
}
