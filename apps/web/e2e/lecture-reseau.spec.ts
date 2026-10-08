import { expect, test, type CDPSession, type Page } from '@playwright/test';

/**
 * Lecture sur réseaux instables (RDC) : 3G simulée, coupure puis reprise, qualité mémorisée.
 * Prérequis : un film publié avec une vidéo d'au moins 3 minutes
 * (`docker exec ecine-worker-dev node dist/seed/demo-video.js le-chant-des-pirogues --seconds 300`).
 * L'émulation réseau passe par le protocole Chromium (Edge ou Chrome).
 */
const FILM = process.env.E2E_VIDEO_FILM ?? '/fr/films/le-chant-des-pirogues';

/** 3G chargée : 750 kbit/s descendants, 300 ms de latence. */
const SLOW_3G = {
  offline: false,
  latency: 300,
  downloadThroughput: (750 * 1000) / 8,
  uploadThroughput: (250 * 1000) / 8,
};

async function throttle(page: Page): Promise<CDPSession> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', SLOW_3G);
  return cdp;
}

/**
 * Page chargée normalement (en développement, le JavaScript non optimisé pèse plusieurs Mo), puis
 * réseau bridé au moment du clic : on mesure la vidéo, pas le chargement du site.
 * Renvoie l'instant du clic sur « Regarder ».
 */
async function startPlayback(page: Page, slowNetwork = false): Promise<number> {
  await page.goto(FILM, { waitUntil: 'networkidle' });
  if (slowNetwork) await throttle(page);
  const clickedAt = Date.now();
  await page.getByRole('button', { name: /Regarder|Reprendre/ }).click();
  await page.waitForFunction(() => (document.querySelector('video')?.currentTime ?? 0) > 1, null, {
    timeout: 45_000,
  });
  return clickedAt;
}

async function openQualityMenu(page: Page): Promise<void> {
  // Un toucher sur le lecteur réveille les commandes (masquées après 3 s), comme pour un utilisateur.
  await page.getByRole('region', { name: /^Lecture :/ }).dispatchEvent('pointerdown');
  await page.getByRole('button', { name: 'Qualité, Vitesse' }).click();
}

test.describe('Lecture sur réseau lent', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Émulation réseau Chromium');
  test.setTimeout(150_000);

  test('démarre en 3G et choisit une qualité adaptée au débit', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    const clickedAt = await startPlayback(page, true);
    // Critère du lot 1 : lecture lancée en moins de 15 s sur une 3G chargée (sans cache vidéo).
    expect(Date.now() - clickedAt).toBeLessThan(15_000);
    const height = await page.evaluate(() => document.querySelector('video')?.videoHeight ?? 0);
    expect(height).toBeGreaterThan(0);
    expect(height).toBeLessThanOrEqual(360);

    await openQualityMenu(page);
    const menu = page.getByRole('group', { name: 'Qualité' });
    await expect(menu.getByText(/^Auto \(\d+p\)$/)).toBeVisible();
    await expect(menu.getByText(/Mo\/h$/).first()).toBeVisible();
  });

  test('reprend seule après une coupure du réseau', async ({ page, context }) => {
    await startPlayback(page, true);

    await context.setOffline(true);
    // Saut au-delà de la partie chargée : sans réseau, la lecture doit attendre.
    await page.evaluate(() => {
      const video = document.querySelector('video')!;
      const end = video.buffered.length ? video.buffered.end(video.buffered.length - 1) : 0;
      video.currentTime = Math.min(video.duration - 20, end + 30);
    });
    await expect(
      page.getByText('Pas de connexion. La lecture reprendra toute seule'),
    ).toBeVisible();
    await expect(
      page.getByRole('status').filter({ hasText: 'Chargement de la vidéo' }),
    ).toBeVisible();

    const stalledAt = await page.evaluate(() => document.querySelector('video')!.currentTime);
    await page.waitForTimeout(8_000);
    await context.setOffline(false);

    await page.waitForFunction(
      (from) => (document.querySelector('video')?.currentTime ?? 0) > from + 2,
      stalledAt,
      { timeout: 60_000 },
    );
    await expect(page.getByText('Pas de connexion. La lecture reprendra toute seule')).toBeHidden();
  });

  test('le choix manuel de la qualité est mémorisé pour la lecture suivante', async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('e2e-cleared')) {
        localStorage.clear();
        sessionStorage.setItem('e2e-cleared', '1');
      }
    });
    await startPlayback(page);
    await openQualityMenu(page);
    await page.getByRole('radio', { name: /^240p/ }).check();

    await page.reload();
    await page.getByRole('button', { name: /Regarder|Reprendre/ }).click();
    await page.waitForFunction(
      () => (document.querySelector('video')?.currentTime ?? 0) > 1,
      null,
      {
        timeout: 45_000,
      },
    );
    await openQualityMenu(page);
    await expect(page.getByRole('radio', { name: /^240p/ })).toBeChecked();
  });
});
