'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Enregistre le service worker (production uniquement) et propose, sans insister,
 * de passer à la nouvelle version quand elle est prête.
 */
export function ServiceWorker() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        if (registration.waiting && navigator.serviceWorker.controller)
          setWaiting(registration.waiting);
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          installing?.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller)
              setWaiting(installing);
          });
        });
      })
      .catch(() => undefined);
    return () =>
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  }, []);

  if (!waiting) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 top-4 z-50 flex items-center justify-between gap-4 border border-border-strong bg-surface-1 px-4 py-3 md:left-auto md:right-6 md:w-96"
    >
      <p className="text-sm">Nouvelle version disponible.</p>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => waiting.postMessage({ type: 'SKIP_WAITING' })}
      >
        Mettre à jour
      </Button>
    </div>
  );
}
