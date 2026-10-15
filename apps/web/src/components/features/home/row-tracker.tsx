'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { track } from '@/lib/analytics';

/**
 * Mesure d'une rangée de l'accueil (plan de mesure du lot 0, sous le choix cookies) :
 * `home_row_impression` une fois, quand la moitié de la rangée est visible ; `home_row_click` à chaque
 * tuile touchée, avec sa position dans la rangée (`value`, à partir de 0).
 */
export function RowTracker({ row, children }: { row: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        track({ type: 'home_row_impression', source: row });
        observer.disconnect();
      },
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [row]);

  return (
    <div
      ref={ref}
      onClickCapture={(event) => {
        const link = (event.target as Element).closest('a');
        if (!link || !ref.current) return;
        const tiles = [...ref.current.querySelectorAll('.no-scrollbar > a')];
        const position = tiles.indexOf(link);
        track({
          type: 'home_row_click',
          source: row,
          ...(position >= 0 ? { value: position } : {}),
        });
      }}
    >
      {children}
    </div>
  );
}
