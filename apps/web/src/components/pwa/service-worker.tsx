'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { track } from '@/lib/analytics';

/**
 * Enregistre le service worker (production uniquement) et propose, sans insister,
 * de passer à la nouvelle version quand elle est prête.
 */
export function ServiceWorker() {
  const t = useTranslations('pwa');
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  // Installation de l'application (indicateur « Installation de l'app » du PRD de la refonte).
  useEffect(() => {
    const onInstalled = () => track({ type: 'appinstalled' });
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);

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
      className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+12px)] z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-full bg-surface-3 py-2 pl-4 pr-2 shadow-[var(--shadow-menu)] animate-[ecine-fade_var(--dur-base)_var(--ease-standard)] lg:left-auto lg:right-6 lg:top-[calc(var(--topnav-h)+12px)]"
    >
      <p className="text-[15px] leading-5">{t('updateAvailable')}</p>
      <Button
        size="sm"
        variant="secondary"
        icon="refresh"
        onClick={() => waiting.postMessage({ type: 'SKIP_WAITING' })}
      >
        {t('update')}
      </Button>
    </div>
  );
}
