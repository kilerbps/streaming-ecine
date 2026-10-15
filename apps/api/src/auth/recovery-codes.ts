import { randomInt } from 'node:crypto';
import { RECOVERY_CODE_COUNT } from '@ecine/contracts';
import { hmacHex } from '../common/crypto.js';

/** Alphabet sans caractères ambigus (ni 0, 1, i, l, o) : 31 symboles, 8 par code (≈ 39 bits). */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

/** Forme canonique d'un code saisi : minuscules, sans tiret ni espace. */
export function normalizeRecoveryCode(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Un code de secours se distingue du code à 6 chiffres de l'application. */
export function isRecoveryCode(code: string): boolean {
  const normalized = normalizeRecoveryCode(code);
  return normalized.length === 8 && [...normalized].every((c) => ALPHABET.includes(c));
}

/** Nouveaux codes, affichés « abcd-efgh » ; seule leur empreinte est enregistrée. */
export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
  return Array.from({ length: count }, () => {
    const raw = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  });
}

/**
 * Empreinte d'un code, propre au compte (le même code sur deux comptes donne deux empreintes).
 * HMAC plutôt qu'Argon2 : les codes sont aléatoires et à usage unique, et la connexion en vérifie
 * jusqu'à dix.
 */
export function recoveryHash(secret: string, userId: string, code: string): string {
  return hmacHex(secret, `2fa-recovery:${userId}:${normalizeRecoveryCode(code)}`);
}
