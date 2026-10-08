'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';

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

export function LargeTitle({ children, className = '' }: { children: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const heading = ref.current;
    if (!heading) return;
    // Marge haute = hauteur de l'en-tête : le titre passe dans l'en-tête quand il disparaît dessous.
    const observer = new IntersectionObserver(
      ([entry]) => setHeaderTitle(entry?.isIntersecting === false ? children : null),
      { rootMargin: '-56px 0px 0px 0px' },
    );
    observer.observe(heading);
    return () => {
      observer.disconnect();
      setHeaderTitle(null);
    };
  }, [children]);
  return (
    <h1
      ref={ref}
      className={`font-display text-[28px] font-extrabold leading-8 text-balance lg:text-[40px] lg:leading-[44px] ${className}`}
    >
      {children}
    </h1>
  );
}
