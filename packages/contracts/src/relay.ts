import { z } from 'zod';

/**
 * Relais signé du serveur Next.js vers l'API (ADR-0015) : l'IP réelle du visiteur, son agent et son
 * appareil voyagent dans des en-têtes couverts par une signature HMAC-SHA256 avec horodatage, à la
 * place d'une clé statique. Une clé qui fuite dans des journaux ne permet ni de rejouer une requête
 * (30 s au plus) ni de forger l'IP ou l'appareil d'un autre.
 *
 * Fonctions pures, sans cryptographie : le site et l'API calculent la même chaîne à signer.
 */
export const RELAY_HEADERS = {
  /** `{horodatage en ms}.{signature hexadécimale}` */
  signature: 'x-ecine-relay',
  ip: 'x-client-ip',
  userAgent: 'x-client-user-agent',
  /** `{identifiant}.{émission}.{fin de vérification}` (secondes), voir `DeviceClaims`. */
  device: 'x-client-device',
} as const;

export const RELAY_MAX_SKEW_MS = 30_000;

export interface RelayParts {
  timestamp: string;
  method: string;
  /** Chemin et chaîne de requête, tels qu'envoyés (`/v1/films?limit=24`). */
  path: string;
  ip?: string;
  userAgent?: string;
  device?: string;
}

/** Chaîne signée : une ligne par champ, versionnée. */
export function relayCanonical(parts: RelayParts): string {
  return [
    'ecine-relay-v1',
    parts.timestamp,
    parts.method.toUpperCase(),
    parts.path,
    parts.ip ?? '',
    parts.userAgent ?? '',
    parts.device ?? '',
  ].join('\n');
}

/** Appareil du visiteur (cookie signé par le site) : jamais de donnée personnelle. */
export interface DeviceClaims {
  /** 128 bits aléatoires, base64url. */
  id: string;
  /** Émission, en secondes depuis l'époque. */
  issuedAt: number;
  /** Fin de vérification Turnstile, en secondes ; 0 si l'appareil n'a jamais été vérifié. */
  verifiedUntil: number;
}

const DEVICE_ID = /^[A-Za-z0-9_-]{22}$/;

export function formatDevice(device: DeviceClaims): string {
  return `${device.id}.${device.issuedAt}.${device.verifiedUntil}`;
}

export function parseDevice(value: string | undefined | null): DeviceClaims | null {
  if (!value) return null;
  const [id, issuedAt, verifiedUntil, extra] = value.split('.');
  if (extra !== undefined || !id || !DEVICE_ID.test(id)) return null;
  const issued = Number(issuedAt);
  const verified = Number(verifiedUntil);
  if (
    !Number.isSafeInteger(issued) ||
    !Number.isSafeInteger(verified) ||
    issued <= 0 ||
    verified < 0
  )
    return null;
  return { id, issuedAt: issued, verifiedUntil: verified };
}

/** Vérification d'un appareil (Turnstile invisible sur la fiche d'un film, ADR-0015). */
export const deviceVerifyInputSchema = z.object({
  /** Absent en développement sans clé Turnstile (le serveur saute alors le contrôle). */
  turnstileToken: z.string().min(1).max(2048).optional(),
});
export type DeviceVerifyInput = z.infer<typeof deviceVerifyInputSchema>;

export const deviceVerificationSchema = z.object({
  /** Fin de vérification, en secondes depuis l'époque. */
  verifiedUntil: z.number().int().positive(),
});
export type DeviceVerification = z.infer<typeof deviceVerificationSchema>;
