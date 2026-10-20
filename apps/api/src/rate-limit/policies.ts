import type { IpClass } from './geo.service.js';

/**
 * Valeurs de départ des limites de débit (ADR-0015, tableau « Valeurs de départ »), à régler après
 * les deux semaines d'observation. Seule source de ces chiffres.
 */
export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;

export type ByClass = Record<IpClass, number>;

/** Ouverture d'une session de lecture (par 10 min). */
export const SESSION_OPEN = {
  periodMs: 10 * MINUTE,
  /** Par identité : compte, appareil vérifié, appareil neuf. */
  identity: { account: 20, verified: 15, unverified: 5 },
  /** Pot commun des appareils neufs, rattaché à l'IP. */
  newDevicePot: { rdc: 150, other: 40, hosting: 10 } satisfies ByClass,
  /** Plafond global de l'IP : plancher, et pour la RDC max(plancher ; facteur × appareils vérifiés vus en 1 h). */
  ipFloor: { rdc: 600, other: 200, hosting: 50 } satisfies ByClass,
  verifiedDeviceFactor: 20,
  /** Sessions simultanées (le renouvellement du jeton sert de signal de présence). */
  concurrent: { account: 3, device: 2 },
} as const;

/** Aperçus servis par une session (repli si un ayant droit refuse l'extrait statique). */
export const PREVIEW_SESSIONS = { limit: 60, periodMs: 10 * MINUTE } as const;

/** Par session de lecture. */
export const PER_SESSION = {
  refresh: { limit: 4, periodMs: 5 * MINUTE },
  keys: { limit: 20, periodMs: 5 * MINUTE },
  /** Inchangé tant que le Worker de bordure n'existe pas (ADR-0015, reporté). */
  segments: { limit: 150, periodMs: MINUTE },
} as const;

/** Demandes de clé par compte ou appareil (par heure). */
export const KEYS_PER_IDENTITY = { limit: 100, periodMs: HOUR } as const;

/** Nouveaux appareils vérifiés par IP et par heure : freine les fermes de robots. */
export const VERIFIED_DEVICES_PER_IP: ByClass = { rdc: 200, other: 20, hosting: 3 };
/** Durée d'une vérification Turnstile, prolongée à chaque visite active. */
export const DEVICE_VERIFIED_TTL_SEC = 24 * 60 * 60;

/** Limite générale de l'API (par minute) : par identité, et plafond anti-inondation par IP. */
export const GENERAL = {
  identity: 300,
  ip: { rdc: 3000, other: 600, hosting: 120 } satisfies ByClass,
  /** IPv6 : agrégat du /48 = facteur × la limite d'un appareil. */
  block48Factor: 20,
} as const;

/** Routes sensibles sans plafond IP explicite : plafond IP = limite de la route × facteur. */
export const SENSITIVE_IP_FACTOR: ByClass = { rdc: 10, other: 3, hosting: 1 };
