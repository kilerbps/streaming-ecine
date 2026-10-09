import { expect, test, type Page } from '@playwright/test';

/**
 * Coquille native du lot 2 de la refonte (docs/design/03-experience-native.md) : navigation, touche
 * retour qui ferme une feuille, mode allégé, statuts HTTP.
 */
async function refuseCookies(page: Page) {
  const refuse = page.getByRole('button', { name: 'Tout refuser' });
  if (await refuse.isVisible().catch(() => false)) await refuse.click();
}

test.describe('Coquille native', () => {
  test('quatre onglets et la recherche, onglet courant annoncé', async ({ page, isMobile }) => {
    await page.goto('/fr');
    await refuseCookies(page);
    const nav = page
      .getByRole('navigation', { name: 'Navigation principale' })
      .locator('visible=true');
    await expect(nav).toHaveCount(1);
    await expect(nav.getByRole('link', { name: 'Accueil', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    for (const name of ['Découvrir', 'Nouveautés', 'Moi']) {
      await expect(nav.getByRole('link', { name, exact: true })).toBeVisible();
    }
    if (isMobile) await expect(nav.getByRole('link', { name: 'Rechercher' })).toBeVisible();
    else await expect(nav.getByRole('searchbox')).toBeVisible();

    await nav.getByRole('link', { name: 'Découvrir', exact: true }).click();
    await expect(page).toHaveURL(/\/fr\/decouvrir$/);
    await expect(nav.getByRole('link', { name: 'Découvrir', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('la touche retour ferme la feuille sans quitter l’écran', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Pastilles de l’accueil : mobile');
    await page.goto('/fr');
    await refuseCookies(page);
    await page.getByRole('button', { name: 'Catégories' }).click();
    const sheet = page.getByRole('dialog', { name: 'Catégories' });
    await expect(sheet).toBeVisible();

    await page.goBack();
    await expect(sheet).toBeHidden();
    await expect(page).toHaveURL(/\/fr$/);

    // Un lien dans la feuille : la feuille se ferme, puis la navigation ; retour = accueil.
    await page.getByRole('button', { name: 'Catégories' }).click();
    await sheet.getByRole('link').first().click();
    await expect(page).toHaveURL(/\/fr\/categories\//);
    await page.goBack();
    await expect(page).toHaveURL(/\/fr$/);
    await expect(sheet).toBeHidden();
  });

  test('chaque onglet garde sa position de défilement', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Barre d’onglets : mobile');
    await page.goto('/fr');
    await refuseCookies(page);
    const tabs = page.getByRole('navigation', { name: 'Navigation principale' });
    await page.evaluate(() => window.scrollTo(0, 1200));
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBeGreaterThan(1000);
    const position = await page.evaluate(() => Math.round(window.scrollY));

    await tabs.getByRole('link', { name: 'Découvrir', exact: true }).click();
    await expect(page).toHaveURL(/\/fr\/decouvrir$/);
    await tabs.getByRole('link', { name: 'Accueil', exact: true }).click();
    await expect(page).toHaveURL(/\/fr$/);
    await expect
      .poll(() => page.evaluate(() => Math.round(window.scrollY)))
      .toBeGreaterThanOrEqual(position - 2);
  });

  test('mode allégé forcé : matériau plein, sans flou', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'ecine_perf', value: 'on', url: baseURL ?? '' }]);
    await page.goto('/fr');
    await expect(page.locator('html')).toHaveAttribute('data-perf', 'lite');
    const blur = await page
      .locator('.chrome, .chrome-bar')
      .first()
      .evaluate((node) => getComputedStyle(node).backdropFilter);
    expect(blur).toBe('none');
  });

  test('statuts HTTP réels : 404 pour une fiche inconnue', async ({ page }) => {
    const response = await page.goto('/fr/films/ce-film-n-existe-pas');
    expect(response?.status()).toBe(404);
  });
});
