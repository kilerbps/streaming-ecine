import { appendFileSync, mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { applyReferenceProfile } from '../reference-device';

/**
 * Mesures de laboratoire sur l'appareil de référence (lot 0 de la refonte) : LCP, CLS, blocage du fil
 * principal (approximation du TBT de Lighthouse) et poids du JavaScript, pour 5 pages.
 * À lancer sur un build de production, un test à la fois :
 * `E2E_PERF=1 E2E_BASE_URL=… playwright test --project=android-ref --workers=1` (résultats dans
 * `test-results/perf-reference.jsonl`).
 * Les budgets R-PERF sont vérifiés en souple (`expect.soft`) : le rapport liste les dépassements sans
 * bloquer la mesure ; ils deviennent bloquants à la porte G2.
 */
const PAGES = [
  { name: 'Accueil', path: '/fr' },
  { name: 'Fiche film', path: process.env.E2E_PERF_FILM ?? '/fr/films/le-chant-des-pirogues' },
  { name: 'Catalogue films', path: '/fr/films' },
  { name: 'Recherche', path: '/fr/recherche?q=kin' },
  { name: 'Talents', path: '/fr/personnes' },
];

const BUDGET = { lcpMs: 2_500, cls: 0.1, blockingMs: 200 };

interface Metrics {
  page: string;
  path: string;
  lcpMs: number;
  cls: number;
  blockingMs: number;
  jsKb: number;
  fontKb: number;
  totalKb: number;
}

test.describe('Budgets de performance (appareil de référence)', () => {
  test.skip(!process.env.E2E_PERF, 'Mesure de laboratoire : E2E_PERF=1 sur un build de production');
  test.skip(({ browserName }) => browserName !== 'chromium', 'Profil Chromium');
  test.setTimeout(120_000);
  // Première visite : sans service worker, qui échapperait d'ailleurs au bridage réseau de la page.
  test.use({ serviceWorkers: 'block' });

  for (const target of PAGES) {
    test(`${target.name} (${target.path})`, async ({ page }) => {
      await page.addInitScript(() => {
        const perf = { lcp: 0, cls: 0, blocking: 0 };
        (window as unknown as { __perf: typeof perf }).__perf = perf;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) perf.lcp = entry.startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const shift = entry as unknown as { hadRecentInput: boolean; value: number };
            if (!shift.hadRecentInput) perf.cls += shift.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) perf.blocking += Math.max(0, entry.duration - 50);
        }).observe({ type: 'longtask', buffered: true });
      });
      // Octets reçus (compressés) par adresse : la Resource Timing API n'est pas fiable ici (service
      // worker, préchargements comptés deux fois).
      const received = new Map<string, { type: string; bytes: number }>();
      page.on('requestfinished', (request) => {
        void request
          .sizes()
          .then(({ responseBodySize, responseHeadersSize }) => {
            const bytes = responseBodySize + responseHeadersSize;
            const known = received.get(request.url());
            if (!known || known.bytes < bytes)
              received.set(request.url(), { type: request.resourceType(), bytes });
          })
          .catch(() => undefined);
      });
      await applyReferenceProfile(page);
      await page.goto(target.path, { waitUntil: 'load', timeout: 90_000 });
      await page.waitForTimeout(3_000);

      const vitals = await page.evaluate(() => {
        const perf = (
          window as unknown as { __perf: { lcp: number; cls: number; blocking: number } }
        ).__perf;
        return {
          lcpMs: Math.round(perf.lcp),
          cls: Math.round(perf.cls * 1000) / 1000,
          blockingMs: Math.round(perf.blocking),
        };
      });
      const sum = (type?: string) =>
        Math.round(
          [...received.values()]
            .filter((r) => !type || r.type === type)
            .reduce((total, r) => total + r.bytes, 0) / 1024,
        );
      const metrics = { ...vitals, jsKb: sum('script'), fontKb: sum('font'), totalKb: sum() };
      const row: Metrics = { page: target.name, path: target.path, ...metrics };
      mkdirSync('test-results', { recursive: true });
      appendFileSync('test-results/perf-reference.jsonl', `${JSON.stringify(row)}\n`);

      expect.soft(metrics.lcpMs, 'R-PERF-01 : LCP < 2,5 s').toBeLessThan(BUDGET.lcpMs);
      expect.soft(metrics.cls, 'R-PERF-01 : CLS < 0,1').toBeLessThan(BUDGET.cls);
      expect
        .soft(metrics.blockingMs, 'R-PERF-02 : blocage < 200 ms')
        .toBeLessThan(BUDGET.blockingMs);
    });
  }
});
