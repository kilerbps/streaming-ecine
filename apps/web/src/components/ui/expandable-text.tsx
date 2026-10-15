'use client';

import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Texte coupé à quelques lignes avec « plus » (synopsis, biographie). Le bouton n'apparaît que si le
 * texte dépasse vraiment ; sans JavaScript, le texte reste coupé mais entier pour les lecteurs d'écran.
 */
export function ExpandableText({
  children,
  moreLabel,
  lines = 4,
  className = '',
}: {
  children: string;
  moreLabel: string;
  /** Lignes visibles avant « plus » (3 dans l'aperçu rapide, 4 sur les fiches). */
  lines?: 3 | 4;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || expanded) return;
    const measure = () => setOverflows(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [expanded, children]);

  return (
    <div className={className}>
      <p
        ref={ref}
        className={`whitespace-pre-line ${expanded ? '' : lines === 3 ? 'line-clamp-3' : 'line-clamp-4'}`}
      >
        {children}
      </p>
      {overflows && !expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="press -ml-1 mt-1 min-h-11 px-1 text-[15px] font-semibold text-text underline-offset-4 hover:underline"
        >
          {moreLabel}
        </button>
      ) : null}
    </div>
  );
}
