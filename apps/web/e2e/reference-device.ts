import type { Page } from '@playwright/test';

/**
 * Appareil de référence de la refonte (`docs/AGENTS-REFONTE.md`, lot 0) : Android de milieu de gamme
 * à 4 Go de RAM, en 4G lente. Mêmes réglages que le profil mobile de Lighthouse (« Slow 4G » appliqué
 * au niveau des requêtes : latence 562,5 ms, 1 474,6 kbit/s descendants, 675 kbit/s montants)
 * et processeur ralenti 4 fois.
 */
export const REFERENCE_NETWORK = {
  offline: false,
  latency: 562.5,
  downloadThroughput: (1474.6 * 1000) / 8,
  uploadThroughput: (675 * 1000) / 8,
};
export const REFERENCE_CPU_SLOWDOWN = 4;

/** Applique le profil à une page (protocole Chromium : Edge ou Chrome). */
export async function applyReferenceProfile(page: Page): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', REFERENCE_NETWORK);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: REFERENCE_CPU_SLOWDOWN });
}
