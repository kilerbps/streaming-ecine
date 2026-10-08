/**
 * Couleurs de fond utilisées hors CSS (balise theme-color, manifeste de l'application), où une variable
 * CSS ne peut pas être lue. Reflet exact de --bg dans packages/design-tokens/tokens.css :
 * `pnpm check:tokens` échoue si les deux divergent.
 */
export const THEME_COLORS = {
  dark: '#0a0f16',
  light: '#f5f7fa',
  player: '#000000',
} as const;
