'use client';

import { ViewTransition, type ReactNode } from 'react';

/**
 * Transitions de page (docs/design/03-experience-native.md, Transitions de page), activées par
 * `NEXT_PUBLIC_VIEW_TRANSITIONS=1` : la fonction s'appuie sur la version canary de React fournie par
 * Next.js, à valider sur appareils avant la production. Chaque type a toujours la même animation :
 * `tab` (fondu de 150 ms), `push` (approfondissement, poussée depuis la droite) et `pop` (retour).
 * Les navigations sans type (retour du navigateur, rafraîchissement) n'animent rien : quand le
 * téléphone joue sa propre animation de retour, E-Ciné n'en ajoute pas une seconde.
 */
export const VIEW_TRANSITIONS_ENABLED = process.env.NEXT_PUBLIC_VIEW_TRANSITIONS === '1';

const CLASSES = { tab: 'vt-tab', push: 'vt-push', pop: 'vt-pop', default: 'none' };

export function PageTransition({ children }: { children: ReactNode }) {
  if (!VIEW_TRANSITIONS_ENABLED) return children;
  return (
    <ViewTransition enter={CLASSES} exit={CLASSES} default="none">
      {children}
    </ViewTransition>
  );
}
