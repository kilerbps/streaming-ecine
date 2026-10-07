'use client';

import type { SoundName } from './sound';

/** Retours haptiques courts (docs/05 §8). Jamais essentiels : ignorés si l'appareil ne les gère pas. */
const PATTERNS: Partial<Record<SoundName, number | number[]>> = {
  tap: 8,
  like: 12,
  bookmark: 12,
  success: 15,
  error: [25, 40, 25],
};

export function vibrate(name: SoundName, enabled: boolean): void {
  const pattern = PATTERNS[name];
  if (
    !enabled ||
    pattern === undefined ||
    typeof navigator === 'undefined' ||
    !('vibrate' in navigator)
  )
    return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Certains navigateurs refusent sans geste récent : sans conséquence.
  }
}
