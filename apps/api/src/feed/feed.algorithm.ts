import { createHash } from 'node:crypto';
import { z } from 'zod';

/**
 * Ordonnancement du feed (FR-041), fonction pure :
 * - flux principal = contenus récents (publication décroissante) ;
 * - 1 position sur SURPRISE_EVERY = « surprise » tirée des archives dans un ordre propre à la graine
 *   de visite (stable au rechargement, différent d'une visite à l'autre) ;
 * - flux principal épuisé → la suite vient des archives ; aucun contenu n'apparaît deux fois.
 */
export const SURPRISE_EVERY = 6;
const RECENT_MAX = 40;
const RECENT_SHARE = 0.7;

export type EntryType = 'film' | 'post' | 'article';
export interface FeedEntry {
  type: EntryType;
  id: string;
  publishAt: string;
}
export interface PlacedEntry extends FeedEntry {
  surprise: boolean;
}

export const feedCursorSchema = z.object({
  /** Index global du prochain élément. */
  n: z.number().int().min(0),
  /** Date de coupure récents/archives, figée à la première page. */
  c: z.iso.datetime(),
  /** Nombre d'éléments consommés dans chaque flux. */
  m: z.number().int().min(0),
  s: z.number().int().min(0),
});
export type FeedCursor = z.infer<typeof feedCursorSchema>;

export function surpriseRank(seed: string, id: string): string {
  return createHash('md5').update(`${seed}:${id}`).digest('hex');
}

/** Coupure : les ~70 % les plus récents (au plus 40) forment le flux principal. */
export function computeCutoff(entries: FeedEntry[]): string {
  if (entries.length === 0) return new Date(0).toISOString();
  const recentCount = Math.max(1, Math.min(RECENT_MAX, Math.ceil(entries.length * RECENT_SHARE)));
  const boundary = entries[Math.min(recentCount, entries.length) - 1]!;
  return boundary.publishAt;
}

/**
 * @param entries contenus visibles triés par publication décroissante (hors épinglés)
 */
export function buildFeedPage(
  entries: FeedEntry[],
  cursor: FeedCursor | null,
  limit: number,
  seed: string,
): { items: PlacedEntry[]; next: FeedCursor | null } {
  const cutoff = cursor?.c ?? computeCutoff(entries);
  const main = entries.filter((e) => e.publishAt >= cutoff);
  const archive = entries
    .filter((e) => e.publishAt < cutoff)
    .map((e) => ({ e, rank: surpriseRank(seed, e.id) }))
    .sort((a, b) => (a.rank < b.rank ? -1 : a.rank > b.rank ? 1 : 0))
    .map((x) => x.e);

  let n = cursor?.n ?? 0;
  let m = cursor?.m ?? 0;
  let s = cursor?.s ?? 0;
  const items: PlacedEntry[] = [];

  while (items.length < limit && (m < main.length || s < archive.length)) {
    const surpriseSlot = n % SURPRISE_EVERY === SURPRISE_EVERY - 1;
    if ((surpriseSlot && s < archive.length) || m >= main.length) {
      items.push({ ...archive[s]!, surprise: m < main.length });
      s++;
    } else {
      items.push({ ...main[m]!, surprise: false });
      m++;
    }
    n++;
  }

  const exhausted = m >= main.length && s >= archive.length;
  return { items, next: exhausted ? null : { n, c: cutoff, m, s } };
}

/** Graine de visite valide (cookie), sinon dérivée de la date du jour (repli déterministe). */
export function normalizeSeed(seed: string | undefined): string {
  return seed && /^[a-z0-9]{6,32}$/.test(seed)
    ? seed
    : new Date().toISOString().slice(0, 10).replaceAll('-', '');
}
