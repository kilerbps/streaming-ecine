'use client';

import {
  pushKeyAction,
  removePushSubscriptionAction,
  savePushSubscriptionAction,
} from '@/server/actions/push';

/**
 * Notifications Web Push (ADR-0014). Sur iPhone, elles n'existent que dans l'application installée
 * (iOS 16.4 et plus) : ailleurs dans Safari, `PushManager` est absent et l'e-mail suffit.
 */
export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export type PushResult = 'enabled' | 'denied' | 'unsupported' | 'error';

/** Clé VAPID base64url → octets attendus par `pushManager.subscribe`. */
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4))
    .replaceAll('-', '+')
    .replaceAll('_', '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** Demande la permission (après un geste), abonne l'appareil et l'enregistre pour le membre. */
export async function enablePush(): Promise<PushResult> {
  if (!pushSupported()) return 'unsupported';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  const publicKey = await pushKeyAction();
  if (!publicKey) return 'unsupported';
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(publicKey),
      }));
    const result = await savePushSubscriptionAction(subscription.toJSON());
    return result.ok ? 'enabled' : 'error';
  } catch {
    return 'error';
  }
}

/** Désabonne cet appareil (Réglages). */
export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  await removePushSubscriptionAction(subscription.endpoint);
  await subscription.unsubscribe();
}

/** Cet appareil reçoit-il déjà les notifications ? */
export async function pushEnabled(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  const registration = await navigator.serviceWorker.getRegistration();
  return Boolean(await registration?.pushManager.getSubscription());
}
