/**
 * Réglages réseau du lecteur pour des connexions mobiles variables (RDC : 3G chargée, coupures).
 * Fonctions pures, testées sans navigateur (`network.test.ts`) ; `use-hls.ts` les branche sur hls.js.
 */

/** Sous-ensemble de la Network Information API (Chrome Android) : absent sur Safari et Firefox. */
export interface ConnectionInfo {
  /** Débit descendant estimé, en Mbit/s (plafonné à 10 par Chrome). */
  downlink?: number;
  effectiveType?: string;
  saveData?: boolean;
}

export function readConnection(): ConnectionInfo | null {
  if (typeof navigator === 'undefined') return null;
  return (navigator as Navigator & { connection?: ConnectionInfo }).connection ?? null;
}

export function readDeviceMemory(): number | null {
  if (typeof navigator === 'undefined') return null;
  return (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null;
}

/** Débit retenu par type de réseau quand le navigateur ne donne pas de mesure (bit/s, prudent). */
const BY_EFFECTIVE_TYPE: Record<string, number> = {
  'slow-2g': 50_000,
  '2g': 150_000,
  '3g': 700_000,
  '4g': 2_000_000,
};
/** Valeur par défaut de hls.js (`abrEwmaDefaultEstimate`). */
export const DEFAULT_ESTIMATE = 500_000;
const MIN_ESTIMATE = 50_000;
const MAX_ESTIMATE = 20_000_000;
/** Au-delà, la dernière mesure ne dit plus rien du réseau actuel (autre lieu, autre forfait). */
const STORED_ESTIMATE_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

export interface StoredEstimate {
  bps: number;
  at: number;
}

const clampEstimate = (bps: number) => Math.min(MAX_ESTIMATE, Math.max(MIN_ESTIMATE, bps));

/**
 * Débit de départ (bit/s) avant la première image : dernière mesure récente sur cet appareil, sinon
 * l'estimation du navigateur (avec 20 % de marge), sinon le type de réseau, sinon la valeur de hls.js.
 */
export function initialBandwidthEstimate(
  connection: ConnectionInfo | null,
  stored: StoredEstimate | null,
  now: number,
): number {
  if (stored && now - stored.at < STORED_ESTIMATE_MAX_AGE_MS && stored.bps > 0) {
    return clampEstimate(stored.bps);
  }
  if (connection?.downlink && connection.downlink > 0) {
    return clampEstimate(connection.downlink * 1_000_000 * 0.8);
  }
  const byType = connection?.effectiveType ? BY_EFFECTIVE_TYPE[connection.effectiveType] : undefined;
  return byType ?? DEFAULT_ESTIMATE;
}

/** Vrai si le visiteur ou son téléphone demande d'économiser les données. */
export function wantsSaveData(preference: boolean, connection: ConnectionInfo | null): boolean {
  return preference || connection?.saveData === true;
}

export interface BufferProfile {
  maxBufferLength: number;
  maxMaxBufferLength: number;
  backBufferLength: number;
  maxBufferSize: number;
}

/**
 * Tampon : 60 s d'avance pour encaisser les coupures (jusqu'à 120 s si le débit le permet) ;
 * 30 s en arrière seulement et 30 Mo au plus sur les téléphones à 2 Go de mémoire ou moins.
 * En économie de données, peu d'avance : ce qui est chargé puis abandonné est perdu pour le forfait.
 */
export function bufferProfile(saveData: boolean, deviceMemoryGb: number | null): BufferProfile {
  const lowMemory = deviceMemoryGb !== null && deviceMemoryGb <= 2;
  const maxBufferSize = (lowMemory ? 30 : 60) * 1000 * 1000;
  if (saveData) {
    return { maxBufferLength: 20, maxMaxBufferLength: 40, backBufferLength: 10, maxBufferSize };
  }
  return { maxBufferLength: 60, maxMaxBufferLength: 120, backBufferLength: 30, maxBufferSize };
}

/**
 * Chargement des segments sur réseau lent : premier octet attendu 15 s (contre 10), plus d'essais
 * et une attente qui s'allonge, pour qu'une coupure de quelques secondes ne devienne pas une erreur.
 */
export const FRAGMENT_LOAD_POLICY = {
  default: {
    maxTimeToFirstByteMs: 15_000,
    maxLoadTimeMs: 120_000,
    timeoutRetry: { maxNumRetry: 6, retryDelayMs: 1_000, maxRetryDelayMs: 8_000 },
    errorRetry: { maxNumRetry: 10, retryDelayMs: 1_000, maxRetryDelayMs: 15_000 },
  },
};

/** Monter de qualité prudemment, descendre vite (valeurs par défaut de hls.js : 0,95 et 0,7). */
export const ABR_FACTORS = { abrBandWidthFactor: 0.8, abrBandWidthUpFactor: 0.6 };

/** Attente entre deux tentatives de reprise après une coupure (la dernière valeur se répète). */
export const RECOVERY_DELAYS_MS = [3_000, 6_000, 12_000, 20_000, 30_000];

export function recoveryDelay(attempt: number): number {
  return RECOVERY_DELAYS_MS[Math.min(attempt, RECOVERY_DELAYS_MS.length - 1)]!;
}

/**
 * Qualité mémorisée : la plus haute qui ne dépasse pas la hauteur voulue, sinon la plus basse.
 * Renvoie l'index hls.js, ou -1 s'il n'y a aucune qualité.
 */
export function preferredLevelIndex(levels: ReadonlyArray<{ height: number }>, height: number): number {
  let best = -1;
  let lowest = -1;
  levels.forEach((level, index) => {
    if (lowest === -1 || level.height < levels[lowest]!.height) lowest = index;
    if (level.height <= height && (best === -1 || level.height > levels[best]!.height)) best = index;
  });
  return best === -1 ? lowest : best;
}

/** Consommation maximale d'une heure de lecture à ce débit, en octets. */
export function bytesPerHour(bitrate: number): number {
  return (bitrate * 3600) / 8;
}

/** « ≈ 225 Mo/h », « ≈ 1,2 Go/h » (débit plafond annoncé par la playlist). */
export function formatDataPerHour(bitrate: number, locale = 'fr'): string {
  const megabytes = bytesPerHour(bitrate) / 1_000_000;
  if (megabytes >= 1000) {
    const gigabytes = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
      megabytes / 1000,
    );
    return `≈ ${gigabytes} Go/h`;
  }
  const rounded = megabytes >= 100 ? Math.round(megabytes / 10) * 10 : Math.round(megabytes);
  return `≈ ${rounded} Mo/h`;
}

const ESTIMATE_KEY = 'ecine:bw';
const QUALITY_KEY = 'ecine:quality';

/** Lecture tolérante : stockage indisponible (navigation privée, quota) = aucune préférence. */
function safeGet(storage: Storage | null, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeSet(storage: Storage | null, key: string, value: string | null): void {
  try {
    if (value === null) storage?.removeItem(key);
    else storage?.setItem(key, value);
  } catch {
    // Sans stockage local, le lecteur repart simplement des réglages par défaut.
  }
}

export function localStore(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readStoredEstimate(storage: Storage | null): StoredEstimate | null {
  const raw = safeGet(storage, ESTIMATE_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredEstimate>;
    return typeof value.bps === 'number' && typeof value.at === 'number'
      ? { bps: value.bps, at: value.at }
      : null;
  } catch {
    return null;
  }
}

export function storeEstimate(storage: Storage | null, bps: number, now: number): void {
  if (Number.isFinite(bps) && bps > 0) {
    safeSet(storage, ESTIMATE_KEY, JSON.stringify({ bps: Math.round(bps), at: now }));
  }
}

/** Hauteur choisie à la main (ex. 360), ou `null` pour « Auto ». */
export function readQualityPreference(storage: Storage | null): number | null {
  const value = Number(safeGet(storage, QUALITY_KEY));
  return Number.isInteger(value) && value > 0 ? value : null;
}

export function storeQualityPreference(storage: Storage | null, height: number | null): void {
  safeSet(storage, QUALITY_KEY, height === null ? null : String(height));
}
