'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePreferences } from '@/components/providers/preferences';
import { DEVICE_VERIFIED_EVENT, DEVICE_VERIFY_EVENT } from '@/lib/device-events';
import { verifyDeviceAction } from '@/server/actions/device';
import { Turnstile } from './turnstile';

/**
 * Vérification invisible de l'appareil dès l'arrivée sur la fiche d'un film (ADR-0015) : le jeton
 * Turnstile est prêt avant le clic sur « Regarder ». Le widget n'apparaît que si Cloudflare demande
 * une interaction. Un échec ne bloque rien : l'appareil reste « neuf » (pot commun de son IP).
 * Sans clé Turnstile (développement), la vérification part sans jeton et l'API saute le contrôle.
 */
export function DeviceCheck({ needed }: { needed: boolean }) {
  const { theme } = usePreferences();
  const [active, setActive] = useState(needed);
  const sent = useRef(false);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const verify = useCallback(async (token: string | undefined) => {
    if (sent.current) return;
    sent.current = true;
    const result = await verifyDeviceAction(token);
    setActive(false);
    if (result.ok) window.dispatchEvent(new Event(DEVICE_VERIFIED_EVENT));
  }, []);

  // Le lecteur la relance après un refus « pot commun » ou « vérification exigée ».
  useEffect(() => {
    const onAsk = () => {
      sent.current = false;
      setActive(true);
    };
    window.addEventListener(DEVICE_VERIFY_EVENT, onAsk);
    return () => window.removeEventListener(DEVICE_VERIFY_EVENT, onAsk);
  }, []);

  useEffect(() => {
    if (active && !siteKey) void verify(undefined);
  }, [active, siteKey, verify]);

  const onToken = useCallback(
    (token: string | undefined) => {
      if (token) void verify(token);
    },
    [verify],
  );

  if (!active || !siteKey) return null;
  return <Turnstile onToken={onToken} theme={theme} />;
}
