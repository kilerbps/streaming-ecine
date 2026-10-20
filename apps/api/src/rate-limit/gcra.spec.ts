import { describe, expect, it } from 'vitest';
import { gcraParams, gcraStep } from './gcra.js';

/** Envoie `count` requêtes au même instant ; renvoie le nombre acceptées et le dernier TAT. */
function burst(
  count: number,
  now: number,
  params: ReturnType<typeof gcraParams>,
  tat: number | null = null,
) {
  let accepted = 0;
  let current = tat;
  let retry = 0;
  for (let i = 0; i < count; i += 1) {
    const step = gcraStep(current, now, params);
    if (step.allowed) {
      accepted += 1;
      current = step.tat;
    } else retry = step.retryAfterMs;
  }
  return { accepted, tat: current, retry };
}

describe('limite à seau (GCRA)', () => {
  const params = gcraParams({ limit: 20, periodMs: 10 * 60_000 });

  it('accepte une rafale de la moitié du quota, puis refuse', () => {
    const { accepted, retry } = burst(15, 0, params);
    expect(accepted).toBe(10);
    // Une place se libère toutes les 30 s (10 min / 20).
    expect(retry).toBe(30_000);
  });

  it('reprend au rythme régulier, sans fenêtre qui se rouvre d’un coup', () => {
    const first = burst(10, 0, params);
    expect(burst(1, 29_999, params, first.tat).accepted).toBe(0);
    expect(burst(1, 30_000, params, first.tat).accepted).toBe(1);
    // Après une longue pause, la rafale est de nouveau disponible, sans dépasser la moitié.
    expect(burst(20, 3_600_000, params, first.tat).accepted).toBe(10);
  });

  it('respecte une rafale imposée et une limite de 1', () => {
    expect(burst(5, 0, gcraParams({ limit: 10, periodMs: 1000, burst: 1 })).accepted).toBe(1);
    expect(burst(3, 0, gcraParams({ limit: 1, periodMs: 1000 })).accepted).toBe(1);
  });
});
