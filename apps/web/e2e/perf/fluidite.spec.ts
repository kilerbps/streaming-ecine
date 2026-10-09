import { appendFileSync, mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { REFERENCE_CPU_SLOWDOWN } from '../reference-device';

/**
 * Porte G2 de la refonte (docs/AGENTS-REFONTE.md, lot 2) : fluidité sur l'appareil de référence
 * (processeur ralenti 4 fois). Images par seconde pendant le défilement de l'accueil, l'ouverture
 * d'une feuille et le changement d'onglet, et latence d'interaction (approximation de l'INP).
 * À lancer sur un build de production : `E2E_PERF=1 E2E_BASE_URL=… playwright test
 * --project=android-ref --workers=1 e2e/perf/fluidite` (résultats : test-results/perf-fluidite.jsonl).
 * Le réseau n'est pas bridé ici : on mesure le rendu, une fois la page chargée.
 */
const BUDGET = { fps: 55, inpMs: 200 };

interface Sample {
  scenario: string;
  fps: number;
  /** Images de plus de 50 ms (saccade visible). */
  jank: number;
  inpMs: number;
}

async function slowCpu(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: REFERENCE_CPU_SLOWDOWN });
  return cdp;
}

/** Compte les images (requestAnimationFrame) pendant `action`, puis renvoie fps et saccades. */
async function measureFrames(page: Page, action: () => Promise<void>, settleMs: number) {
  await page.evaluate(() => {
    const state = { frames: [] as number[], running: true };
    (window as unknown as { __frames: typeof state }).__frames = state;
    const tick = (time: number) => {
      state.frames.push(time);
      if (state.running) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await action();
  await page.waitForTimeout(settleMs);
  return page.evaluate(() => {
    const state = (window as unknown as { __frames: { frames: number[]; running: boolean } })
      .__frames;
    state.running = false;
    const frames = state.frames;
    const duration = (frames.at(-1) ?? 0) - (frames[0] ?? 0);
    let jank = 0;
    for (let i = 1; i < frames.length; i += 1) if (frames[i]! - frames[i - 1]! > 50) jank += 1;
    return { fps: duration > 0 ? ((frames.length - 1) * 1000) / duration : 0, jank };
  });
}

/** Plus longue interaction observée (Event Timing) : approximation de l'INP. */
async function interactionLatency(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __inp: number }).__inp ?? 0);
}

/** E2E_PERF_LITE=1 : même mesure en mode allégé (sans flou ni ressorts), pour comparer. */
const LITE = Boolean(process.env.E2E_PERF_LITE);

function record(sample: Sample) {
  mkdirSync('test-results', { recursive: true });
  const line = { mode: LITE ? 'allégé' : 'normal', ...sample };
  appendFileSync('test-results/perf-fluidite.jsonl', `${JSON.stringify(line)}\n`);
}

test.describe('Porte G2 : fluidité sur l’appareil de référence', () => {
  test.skip(!process.env.E2E_PERF, 'Mesure de laboratoire : E2E_PERF=1 sur un build de production');
  test.skip(({ browserName }) => browserName !== 'chromium', 'Profil Chromium');
  test.setTimeout(120_000);
  test.use({ serviceWorkers: 'block' });

  test.beforeEach(async ({ page, context, baseURL }) => {
    const url = baseURL ?? '';
    await context.addCookies([
      { name: 'ecine_consent', value: 'necessary', url },
      ...(LITE ? [{ name: 'ecine_perf', value: 'on', url }] : []),
    ]);
    await page.addInitScript(() => {
      (window as unknown as { __inp: number }).__inp = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const event = entry as PerformanceEntry & { interactionId?: number };
          if (event.interactionId) {
            const w = window as unknown as { __inp: number };
            w.__inp = Math.max(w.__inp, entry.duration);
          }
        }
      }).observe({
        type: 'event',
        buffered: true,
        durationThreshold: 16,
      } as PerformanceObserverInit);
    });
    await page.goto('/fr', { waitUntil: 'networkidle' });
    const refuse = page.getByRole('button', { name: 'Tout refuser' });
    if (await refuse.isVisible().catch(() => false)) await refuse.click();
  });

  test('défilement de l’accueil', async ({ page }) => {
    const cdp = await slowCpu(page);
    const result = await measureFrames(
      page,
      async () => {
        await cdp.send('Input.synthesizeScrollGesture', {
          x: 200,
          y: 600,
          yDistance: -2400,
          speed: 1200,
          gestureSourceType: 'touch',
          repeatCount: 1,
        });
      },
      300,
    );
    const sample = { scenario: 'Défilement de l’accueil', ...result, inpMs: 0 };
    record(sample);
    expect.soft(sample.fps, 'G2 : 60 images/s au défilement').toBeGreaterThanOrEqual(BUDGET.fps);
  });

  test('ouverture d’une feuille', async ({ page }) => {
    await slowCpu(page);
    const result = await measureFrames(
      page,
      () => page.getByRole('button', { name: 'Catégories' }).click(),
      800,
    );
    await expect(page.getByRole('dialog', { name: 'Catégories' })).toBeVisible();
    const sample = {
      scenario: 'Ouverture d’une feuille',
      ...result,
      inpMs: await interactionLatency(page),
    };
    record(sample);
    expect.soft(sample.fps, 'G2 : 60 images/s à l’ouverture').toBeGreaterThanOrEqual(BUDGET.fps);
    expect.soft(sample.inpMs, 'G2 : INP < 200 ms').toBeLessThan(BUDGET.inpMs);
  });

  test('changement d’onglet', async ({ page }) => {
    await slowCpu(page);
    const tabs = page.getByRole('navigation', { name: 'Navigation principale' });
    const result = await measureFrames(
      page,
      async () => {
        await tabs.getByRole('link', { name: 'Découvrir', exact: true }).click();
        await page.waitForURL(/\/fr\/decouvrir$/);
      },
      800,
    );
    const sample = {
      scenario: 'Changement d’onglet',
      ...result,
      inpMs: await interactionLatency(page),
    };
    record(sample);
    expect.soft(sample.fps, 'G2 : 60 images/s au changement').toBeGreaterThanOrEqual(BUDGET.fps);
    expect.soft(sample.inpMs, 'G2 : INP < 200 ms').toBeLessThan(BUDGET.inpMs);
  });
});
