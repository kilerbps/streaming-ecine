import { buildFeedPage, computeCutoff, type FeedEntry, SURPRISE_EVERY } from './feed.algorithm.js';

function makeEntries(count: number): FeedEntry[] {
  // Du plus récent au plus ancien, un contenu par jour.
  return Array.from({ length: count }, (_, i) => ({
    type: (['film', 'post', 'article'] as const)[i % 3]!,
    id: `c${String(i).padStart(3, '0')}`,
    publishAt: new Date(Date.UTC(2026, 8, 30) - i * 86_400_000).toISOString(),
  }));
}

function readAll(entries: FeedEntry[], seed: string, limit = 7) {
  const seen: Array<{ id: string; surprise: boolean }> = [];
  let cursor = null;
  for (let guard = 0; guard < 100; guard++) {
    const page = buildFeedPage(entries, cursor, limit, seed);
    seen.push(...page.items);
    if (!page.next) break;
    cursor = page.next;
  }
  return seen;
}

describe('feed', () => {
  const entries = makeEntries(60);

  it('sert chaque contenu exactement une fois, sur toutes les pages', () => {
    const ids = readAll(entries, 'graine01').map((i) => i.id);
    expect(ids).toHaveLength(entries.length);
    expect(new Set(ids).size).toBe(entries.length);
  });

  it('place une surprise toutes les 6 positions tant que le flux principal dure', () => {
    const items = readAll(entries, 'graine01');
    const firstPageWindow = items.slice(0, SURPRISE_EVERY * 4);
    firstPageWindow.forEach((item, index) => {
      expect(item.surprise).toBe(index % SURPRISE_EVERY === SURPRISE_EVERY - 1);
    });
  });

  it('les surprises viennent des archives (plus anciennes que la coupure)', () => {
    const cutoff = computeCutoff(entries);
    const byId = new Map(entries.map((e) => [e.id, e]));
    for (const item of readAll(entries, 'graine01').filter((i) => i.surprise)) {
      expect(byId.get(item.id)!.publishAt < cutoff).toBe(true);
    }
  });

  it('est stable pour une même graine et varie selon la graine', () => {
    const a = readAll(entries, 'graine01').map((i) => i.id);
    const b = readAll(entries, 'graine01').map((i) => i.id);
    const c = readAll(entries, 'autregraine').map((i) => i.id);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('commence par les contenus les plus récents', () => {
    const first = buildFeedPage(entries, null, 5, 'graine01').items.map((i) => i.id);
    expect(first).toEqual(['c000', 'c001', 'c002', 'c003', 'c004']);
  });

  it('gère un catalogue vide ou minuscule', () => {
    expect(buildFeedPage([], null, 10, 'graine01')).toEqual({ items: [], next: null });
    const tiny = readAll(makeEntries(2), 'graine01');
    expect(tiny.map((i) => i.id).sort()).toEqual(['c000', 'c001']);
  });
});
