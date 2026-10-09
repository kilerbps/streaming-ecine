'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Feuille ou menu inscrit dans l'historique (charte, Gestes) : à l'ouverture, une entrée est ajoutée
 * à la même adresse, en gardant l'état de Next.js ; la touche ou le geste retour d'Android ferme donc
 * la couche au lieu de quitter l'écran. Fermée autrement (bouton, Échap, glissement), la couche
 * retire son entrée.
 *
 * Renvoie `leave(after)` : ferme la couche, puis exécute `after` une fois l'entrée retirée. À utiliser
 * pour naviguer depuis la couche (lien, action « Voir la fiche »), sinon le retrait de l'entrée et la
 * navigation se croiseraient.
 */
export function useHistoryLayer(open: boolean, close: () => void): (after: () => void) => void {
  const closeRef = useRef(close);
  const pending = useRef<(() => void) | null>(null);

  useEffect(() => {
    closeRef.current = close;
  });

  useEffect(() => {
    if (!open) return;
    const marker = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.history.pushState({ ...window.history.state, ecineLayer: marker }, '');
    let poppedByBack = false;
    const onPopState = () => {
      poppedByBack = true;
      closeRef.current();
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      const after = pending.current;
      pending.current = null;
      if (poppedByBack || window.history.state?.ecineLayer !== marker) {
        after?.();
        return;
      }
      if (after) window.addEventListener('popstate', () => after(), { once: true });
      window.history.back();
    };
  }, [open]);

  return useCallback((after: () => void) => {
    pending.current = after;
    closeRef.current();
  }, []);
}
