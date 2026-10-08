'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { startSessionIfNeeded, track } from '@/lib/analytics';

/**
 * Mesure d'audience des pages vues (FR-104). Le serveur ne transmet l'événement à l'API que si le
 * visiteur a accepté la catégorie « mesure d'audience » ; aucun identifiant personnel n'est envoyé.
 */
export function PageViewTracker({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || last.current === pathname) return;
    last.current = pathname;
    const referrer =
      document.referrer && !document.referrer.startsWith(window.location.origin)
        ? document.referrer
        : undefined;
    startSessionIfNeeded(pathname);
    track({ type: 'page_view', path: pathname, referrer });
  }, [enabled, pathname]);

  return null;
}
