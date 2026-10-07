import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** Refuse la bannière cookies pour qu'elle ne masque pas le contenu (et vérifie qu'on peut refuser en un geste). */
async function refuseCookies(page: Page) {
  const refuse = page.getByRole('button', { name: 'Tout refuser' });
  if (await refuse.isVisible().catch(() => false)) await refuse.click();
}

function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.cd`;
}

test.describe('Parcours 1 — découverte sans compte', () => {
  test('le feed mène à une fiche film lisible sans connexion', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/fr$/);
    await refuseCookies(page);
    await expect(page.getByRole('heading', { level: 1, name: 'À découvrir' })).toBeVisible();
    const firstFilm = page.getByRole('link', { name: 'Voir le film' }).first();
    await firstFilm.click();
    await expect(page).toHaveURL(/\/fr\/films\/[a-z0-9-]+$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Une seule action principale visible sur l'écran (règle « un seul CTA »).
    expect(await page.locator('[data-cta="primary"]:visible').count()).toBeLessThanOrEqual(1);
  });
});

test.describe('Parcours 2 — action différée', () => {
  test('« J’aime » sans compte → inscription → j’aime enregistré, au même endroit', async ({
    page,
  }) => {
    await page.goto('/fr/films');
    await refuseCookies(page);
    await page.locator('a[href^="/fr/films/"]').first().click();
    await expect(page).toHaveURL(/\/fr\/films\//);
    const filmUrl = page.url();

    await page
      .getByRole('button', { name: 'J’aime' })
      .or(page.getByRole('button', { name: "J'aime" }))
      .first()
      .click();
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByText('Connectez-vous pour continuer')).toBeVisible();
    await sheet.getByRole('button', { name: 'Créer un compte' }).click();
    await sheet.getByLabel('Nom affiché').fill('Testeur E2E');
    await sheet.getByLabel('Adresse e-mail').fill(uniqueEmail());
    await sheet.getByLabel('Mot de passe').fill('une phrase de passe pour les tests');
    await sheet.getByRole('checkbox').check();
    await sheet.getByRole('button', { name: 'Créer un compte' }).click();

    await expect(sheet).toBeHidden();
    expect(page.url()).toBe(filmUrl);
    await expect(page.getByRole('button', { name: /Je n.aime plus/ }).first()).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // L'état vient bien du serveur : il survit au rechargement.
    await page.reload();
    await expect(page.getByRole('button', { name: /Je n.aime plus/ }).first()).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

test.describe('Parcours 3 — recherche', () => {
  test('une faute de frappe trouve quand même le talent', async ({ page }) => {
    await page.goto('/fr/recherche?q=Lukussa');
    await refuseCookies(page);
    await expect(page.getByRole('heading', { name: 'Talents' })).toBeVisible();
    await page
      .getByRole('link', { name: /Lukusa/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/fr\/personnes\//);
    await expect(page.getByRole('heading', { name: 'Filmographie' })).toBeVisible();
  });
});

test.describe('Parcours 5 — déconnexion', () => {
  test('un seul geste : session révoquée, données privées effacées', async ({ page, context }) => {
    await page.goto('/fr/compte/inscription');
    await refuseCookies(page);
    await page.getByLabel('Nom affiché').fill('Testeur Déconnexion');
    await page.getByLabel('Adresse e-mail').fill(uniqueEmail());
    await page.getByLabel('Mot de passe').fill('une phrase de passe pour les tests');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Créer un compte' }).click();
    // Première visite en mode développement : la page est compilée à la volée, d'où un délai plus long.
    await expect(page).toHaveURL(/\/fr\/moi$/, { timeout: 45_000 });
    await page.evaluate(() => localStorage.setItem('ecine:progress:test', '42'));

    await page.getByRole('button', { name: 'Se déconnecter' }).click();
    await expect(page).toHaveURL(/\/fr$/, { timeout: 45_000 });
    const cookies = await context.cookies();
    expect(cookies.some((c) => /ecine_(at|rt)$/.test(c.name))).toBe(false);
    expect(await page.evaluate(() => localStorage.getItem('ecine:progress:test'))).toBeNull();
    await page.goto('/fr/moi');
    await expect(page.getByRole('heading', { name: 'Votre espace' })).toBeVisible();
  });
});

test.describe('Pages système', () => {
  test('la page 404 renvoie un vrai statut 404 et un seul CTA', async ({ page }) => {
    const response = await page.goto('/fr/cette-page-nexiste-pas');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('link', { name: "Revenir à l'accueil" })).toBeVisible();
  });
});

test.describe('Accessibilité (axe)', () => {
  for (const path of ['/fr', '/fr/films', '/fr/contact', '/fr/compte/connexion']) {
    test(`aucune violation critique ou sérieuse sur ${path}`, async ({ page }) => {
      await page.goto(path);
      await refuseCookies(page);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const blocking = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(blocking.map((v) => `${v.id}: ${v.nodes.length} élément(s)`)).toEqual([]);
    });
  }
});
