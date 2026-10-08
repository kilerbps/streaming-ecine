'use client';

/**
 * Vibrations (Android, `navigator.vibrate`), réglage « Vibrations » activé par défaut. Jamais
 * essentielles : ignorées si l'appareil ne les gère pas (Safari sur iPhone). Durées de la charte,
 * docs/design/03-experience-native.md (Retours tactiles). Le contournement iPhone par interrupteur
 * natif n'est pas branché : il doit d'abord être essayé sur un iPhone réel.
 */
export type HapticName =
  'tap' | 'like' | 'bookmark' | 'clap' | 'refresh' | 'detent' | 'menu' | 'success' | 'error';

const PATTERNS: Record<HapticName, number | number[]> = {
  tap: 8,
  like: 12,
  bookmark: 12,
  clap: 12,
  refresh: 10,
  detent: 6,
  menu: 20,
  success: 15,
  error: [25, 40, 25],
};

let enabled = true;

export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

export function vibrate(name: HapticName): void {
  if (!enabled || typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate(PATTERNS[name]);
  } catch {
    // Certains navigateurs refusent sans geste récent : sans conséquence.
  }
}
