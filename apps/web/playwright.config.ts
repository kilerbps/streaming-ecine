import { defineConfig, devices } from '@playwright/test';

/**
 * Parcours du PRD §8 en mobile et PC (docs/08-BONNES-PRATIQUES.md §6).
 * Prérequis : API + site démarrés (pnpm dev) et base remplie (pnpm db:seed).
 * En local sous Windows, le navigateur Edge installé est utilisé (aucun téléchargement).
 */
const channel =
  process.env.PLAYWRIGHT_CHANNEL ?? (process.platform === 'win32' ? 'msedge' : undefined);

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    locale: 'fr-FR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], channel }, testIgnore: /perf\// },
    {
      name: 'pc',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, channel },
      testIgnore: /perf\//,
    },
    // Appareil de référence de la refonte (Android modeste, 4G lente, processeur ×4) : e2e/perf.
    {
      name: 'android-ref',
      use: { ...devices['Pixel 7'], channel },
      testMatch: /perf\/.*\.spec\.ts/,
    },
  ],
});
