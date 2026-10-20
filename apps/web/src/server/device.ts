import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { formatDevice, parseDevice, type DeviceClaims } from '@ecine/contracts';

/**
 * Cookie d'appareil (ADR-0015) : identifiant aléatoire de 128 bits, date d'émission, fin de
 * vérification Turnstile, signés par le site (HMAC-SHA256). Aucune donnée personnelle ; il sert de
 * clé aux limites de débit à la place de l'IP (partagée par des centaines d'abonnés en CGNAT).
 * Émis et prolongé par `proxy.ts`, relu par le serveur pour le relais vers l'API.
 */
export const DEVICE_COOKIE = 'ecine_device';
export const DEVICE_COOKIE_MAX_AGE = 180 * 24 * 60 * 60;
/** Vérification prolongée à 24 h à chaque visite active, quand il en reste moins de 12. */
const VERIFIED_SEC = 24 * 60 * 60;
const EXTEND_BELOW_SEC = 12 * 60 * 60;

export function deviceCookieName(secure: boolean): string {
  return secure ? `__Host-${DEVICE_COOKIE}` : DEVICE_COOKIE;
}

function signature(secret: string, value: string): string {
  return createHmac('sha256', secret).update(`ecine-device-v1:${value}`).digest('base64url');
}

export function sealDevice(secret: string, device: DeviceClaims): string {
  const value = formatDevice(device);
  return `${value}.${signature(secret, value)}`;
}

/** Contenu d'un cookie d'appareil intact, sinon `null` (absent, modifié ou d'une autre clé). */
export function openDevice(secret: string, cookie: string | undefined): DeviceClaims | null {
  if (!secret || !cookie) return null;
  const cut = cookie.lastIndexOf('.');
  if (cut < 0) return null;
  const value = cookie.slice(0, cut);
  const given = Buffer.from(cookie.slice(cut + 1));
  const expected = Buffer.from(signature(secret, value));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return parseDevice(value);
}

export function newDevice(nowSec: number): DeviceClaims {
  return { id: randomBytes(16).toString('base64url'), issuedAt: nowSec, verifiedUntil: 0 };
}

/** Visite active d'un appareil vérifié : vérification prolongée sans rien demander. */
export function renewDevice(device: DeviceClaims, nowSec: number): DeviceClaims | null {
  if (device.verifiedUntil <= nowSec || device.verifiedUntil - nowSec >= EXTEND_BELOW_SEC) {
    return null;
  }
  return { ...device, verifiedUntil: nowSec + VERIFIED_SEC };
}

export function isVerified(device: DeviceClaims | null, nowSec: number): boolean {
  return Boolean(device && device.verifiedUntil > nowSec);
}
