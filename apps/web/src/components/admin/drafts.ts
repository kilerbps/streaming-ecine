'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { FieldValues, UseFormSubscribe } from 'react-hook-form';

/**
 * Brouillons locaux des formulaires d'administration (clé `ecine:admin-draft:{type}:{id|new}`).
 * Uniquement les valeurs du formulaire : jamais de jeton ni de donnée de session. Effacés à
 * l'enregistrement et à la déconnexion (purge des clés `ecine:`).
 */

export interface StoredDraft<T> {
  savedAt: string;
  values: T;
  /** Données d'affichage liées (ex. aperçu des images choisies), pour restaurer fidèlement. */
  extra?: unknown;
}

const noopSubscribe = () => () => {};

/** Faux pendant le rendu serveur et l'hydratation, vrai ensuite (pas d'écart d'hydratation). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

function readDraft<T>(key: string): StoredDraft<T> | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredDraft<T>>;
    return typeof parsed.savedAt === 'string' && parsed.values && typeof parsed.values === 'object'
      ? (parsed as StoredDraft<T>)
      : null;
  } catch {
    return null;
  }
}

export function writeDraft(key: string, values: unknown, extra?: unknown): void {
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({ savedAt: new Date().toISOString(), values, extra }),
    );
  } catch {
    // Stockage plein ou indisponible : le brouillon local est un confort, pas une obligation.
  }
}

export function clearDraft(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Stockage indisponible : rien à effacer.
  }
}

/** Brouillon présent à l'ouverture de l'écran (lu une seule fois, dans le navigateur). */
export function useInitialDraft<T>(key: string): {
  draft: StoredDraft<T> | null;
  dismiss: () => void;
} {
  const hydrated = useHydrated();
  const [initial] = useState(() => (typeof window === 'undefined' ? null : readDraft<T>(key)));
  const [dismissed, setDismissed] = useState(false);
  return { draft: hydrated && !dismissed ? initial : null, dismiss: () => setDismissed(true) };
}

/** Sauvegarde automatique (600 ms après la dernière frappe) tant que le formulaire diffère de la version enregistrée. */
export function useAutosave<T extends FieldValues>(
  subscribe: UseFormSubscribe<T>,
  key: string,
  extra?: unknown,
): void {
  const extraRef = useRef(extra);
  useEffect(() => {
    extraRef.current = extra;
  }, [extra]);
  useEffect(() => {
    let timer: number | undefined;
    const unsubscribe = subscribe({
      formState: { values: true, isDirty: true },
      callback: ({ values, isDirty }) => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          if (isDirty) writeDraft(key, values, extraRef.current);
          else clearDraft(key);
        }, 600);
      },
    });
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [subscribe, key]);
}
