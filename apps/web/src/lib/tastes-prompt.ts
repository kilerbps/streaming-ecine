/**
 * Feuille « Qu'aimez-vous regarder ? » (R-ENG-11, docs/design/04) : proposée une fois, au retour sur
 * l'accueil après 10 min d'un premier film ; « Plus tard » la repousse de 7 jours, une seule fois.
 * État gardé dans un cookie de l'appareil (`ecine_tastes_prompt`, ADR-0014).
 */
export type TastesPromptState =
  /** À proposer ; `c` : catégories du film regardé. */
  | { s: 'due'; c: string[] }
  /** Repoussée jusqu'à `u` (secondes depuis l'époque), une seule fois. */
  | { s: 'later'; c: string[]; u: number }
  | { s: 'done' };

export const TASTES_LATER_SECONDS = 7 * 24 * 60 * 60;
export const TASTES_SUGGESTED = 3;

/** Catégories du film regardé si la feuille est à proposer maintenant, sinon `null`. */
export function dueTastesPrompt(state: TastesPromptState | null, nowSec: number): string[] | null {
  if (!state || state.s === 'done') return null;
  if (state.s === 'later' && nowSec < state.u) return null;
  return state.c;
}

/** État après la feuille : enregistrée → close ; « Plus tard » ou fermée → repoussée, une fois. */
export function afterTastesPrompt(
  state: TastesPromptState,
  choice: 'saved' | 'later',
  nowSec: number,
): TastesPromptState {
  if (choice === 'later' && state.s === 'due') {
    return { s: 'later', c: state.c, u: nowSec + TASTES_LATER_SECONDS };
  }
  return { s: 'done' };
}

/**
 * Trois genres pré-choisis : ceux du film regardé (s'ils existent encore), complétés par les
 * catégories les plus fournies du catalogue.
 */
export function suggestTastes(
  watched: readonly string[],
  categories: ReadonlyArray<{ slug: string; filmCount: number }>,
): string[] {
  const known = new Set(categories.map((c) => c.slug));
  const picked = watched.filter((slug) => known.has(slug)).slice(0, TASTES_SUGGESTED);
  const fill = [...categories]
    .sort((a, b) => b.filmCount - a.filmCount)
    .map((c) => c.slug)
    .filter((slug) => !picked.includes(slug));
  return [...picked, ...fill].slice(0, TASTES_SUGGESTED);
}
