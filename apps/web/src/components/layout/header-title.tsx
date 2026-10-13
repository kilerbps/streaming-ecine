'use client';

import { useEffect, useRef, useSyncExternalStore, type ReactNode, type RefObject } from 'react';

/**
 * Grand titre des écrans de premier niveau (Nouveautés, Moi, Recherche) : Titre 1 dans la page, qui
 * se réduit en titre centré de 17 px dans l'en-tête mobile dès qu'il passe sous celui-ci (charte,
 * En-tête et défilement).
 */
let current: string | null = null;
const listeners = new Set<() => void>();

function setHeaderTitle(value: string | null): void {
  if (value === current) return;
  current = value;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Titre à afficher dans l'en-tête, ou `null` tant que le grand titre est visible. */
export function useHeaderTitle(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}

/** Affiche `title` dans l'en-tête mobile dès que l'élément passe sous celui-ci. */
function useCollapsingTitle(ref: RefObject<HTMLElement | null>, title: string): void {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    // Marge haute = hauteur de l'en-tête : le titre passe dans l'en-tête quand il disparaît dessous.
    const observer = new IntersectionObserver(
      ([entry]) => setHeaderTitle(entry?.isIntersecting === false ? title : null),
      { rootMargin: '-56px 0px 0px 0px' },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      setHeaderTitle(null);
    };
  }, [ref, title]);
}

export function LargeTitle({ children, className = '' }: { children: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useCollapsingTitle(ref, children);
  return (
    <h1
      ref={ref}
      className={`font-display text-[28px] font-extrabold leading-8 text-balance lg:text-[40px] lg:leading-[44px] ${className}`}
    >
      {children}
    </h1>
  );
}

/** Titre d'une image immersive (fiche film) : même passage dans l'en-tête, contenu libre (logo-titre). */
export function HeroTitle({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  useCollapsingTitle(ref, title);
  return (
    <h1 ref={ref} className={className}>
      {children}
    </h1>
  );
}
