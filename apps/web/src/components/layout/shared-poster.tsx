'use client';

import { useEffect } from 'react';

/** Nom de transition partagé par l'affiche touchée et l'image de la fiche film. */
export const FILM_POSTER_TRANSITION = 'film-poster';

/**
 * Transition partagée (docs/design/03, Transitions de page) : l'affiche touchée devient l'image de la
 * fiche. Un même film peut figurer dans plusieurs rangées : le nom n'est donc posé qu'au moment du
 * toucher, sur la seule affiche touchée (deux éléments du même nom annuleraient la transition).
 */
export function SharedPosterTransition() {
  useEffect(() => {
    let marked: HTMLElement | null = null;
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest('a[href]');
      if (!link || !/\/films\/[^/?#]+$/.test(new URL((link as HTMLAnchorElement).href).pathname)) {
        return;
      }
      const poster = link.querySelector<HTMLElement>('img:not([aria-hidden="true"])');
      if (!poster) return;
      if (marked) marked.style.viewTransitionName = '';
      poster.style.viewTransitionName = FILM_POSTER_TRANSITION;
      marked = poster;
    };
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);
  return null;
}
