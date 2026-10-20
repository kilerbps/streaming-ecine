import 'server-only';
import { cookies } from 'next/headers';
import { serverConfig } from './config';
import { deviceCookieName, isVerified, openDevice } from './device';

/** Vrai si l'appareil du visiteur a passé Turnstile récemment (cookie d'appareil, ADR-0015). */
export async function deviceVerified(): Promise<boolean> {
  const config = serverConfig();
  const jar = await cookies();
  const device = openDevice(
    config.DEVICE_COOKIE_SECRET,
    jar.get(deviceCookieName(config.COOKIE_SECURE))?.value,
  );
  return isVerified(device, Math.floor(Date.now() / 1000));
}
