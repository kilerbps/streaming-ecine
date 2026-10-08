import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Captures de référence de la page /design (porte G1 de la refonte, puis une par lot) : Nuit, Jour,
 * mode allégé et mouvement réduit, en mobile et en PC, avec un audit axe par mode. Les images vont
 * dans `test-results/design-captures/` ; tout écart d'un lot à l'autre est montré au propriétaire.
 * À lancer sur un site où /design est ouverte (développement, ou DESIGN_PAGE_ENABLED) :
 * `E2E_CAPTURES=1 E2E_BASE_URL=… playwright test e2e/design --project=mobile --project=pc`.
 */
interface Mode {
  name: string;
  theme: 'Nuit' | 'Jour';
  /** Interrupteurs de la barre d'outils de /design à activer. */
  switches: string[];
  reducedMotion?: 'reduce';
}

const MODES: Mode[] = [
  { name: 'nuit', theme: 'Nuit', switches: [] },
  { name: 'jour', theme: 'Jour', switches: [] },
  { name: 'allege', theme: 'Nuit', switches: ['Mode allégé', 'Économie de données'] },
  {
    name: 'mouvement-reduit',
    theme: 'Jour',
    switches: ['Mouvement réduit'],
    reducedMotion: 'reduce',
  },
];

async function prepare(page: Page, mode: Mode) {
  const refuse = page.getByRole('button', { name: 'Tout refuser' });
  if (await refuse.isVisible().catch(() => false)) await refuse.click();
  // Réglages posés par la barre d'outils de la page, comme le ferait l'équipe.
  const toolbar = page.getByRole('group', { name: "Réglages de l'aperçu" });
  await toolbar.getByRole('radio', { name: mode.theme }).click();
  for (const name of mode.switches) await toolbar.getByRole('switch', { name }).click();
  await page.mouse.move(0, 0);
  await page.evaluate(() => document.fonts.ready);
  // Laisse les images arriver et les transitions de couleur se terminer.
  await page.waitForLoadState('networkidle');
}

test.describe('Captures de référence de /design', () => {
  test.skip(!process.env.E2E_CAPTURES, 'Captures à la demande : E2E_CAPTURES=1');
  test.setTimeout(120_000);

  for (const mode of MODES) {
    test(`${mode.name}`, async ({ page }, testInfo) => {
      if (mode.reducedMotion) await page.emulateMedia({ reducedMotion: mode.reducedMotion });
      const response = await page.goto('/fr/design');
      expect(response?.status(), '/design doit être ouverte sur ce site').toBe(200);
      await prepare(page, mode);

      await page.screenshot({
        path: `test-results/design-captures/${testInfo.project.name}-${mode.name}.png`,
        fullPage: true,
        animations: 'disabled',
      });

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
