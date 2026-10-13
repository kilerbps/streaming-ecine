/**
 * Recherches récentes de l'appareil (5 au plus). Elles restent dans le navigateur : la clé commence par
 * `ecine:`, donc la déconnexion les efface (le téléphone peut être partagé).
 */
const KEY = 'ecine:recent-searches';
const MAX = 5;
const EVENT = 'ecine:recent-searches';
const EMPTY: readonly string[] = [];

let cachedRaw: string | null = null;
let cachedList: readonly string[] = EMPTY;

function read(): readonly string[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cachedRaw) return cachedList;
  cachedRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cachedList = Array.isArray(parsed)
      ? parsed.filter((q): q is string => typeof q === 'string').slice(0, MAX)
      : EMPTY;
  } catch {
    cachedList = EMPTY;
  }
  return cachedList;
}

function write(list: readonly string[]): void {
  try {
    if (list.length === 0) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Stockage indisponible (navigation privée) : l'historique n'est simplement pas gardé.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Ajoute une recherche en tête de liste (sans doublon, casse ignorée). */
export function rememberSearch(query: string): void {
  const q = query.trim().replace(/\s+/g, ' ').slice(0, 80);
  if (q.length < 2) return;
  const lower = q.toLowerCase();
  write([q, ...read().filter((item) => item.toLowerCase() !== lower)].slice(0, MAX));
}

export function clearRecentSearches(): void {
  write(EMPTY);
}

/** Abonnement pour `useSyncExternalStore` : autres onglets (`storage`) et cet onglet. */
export function subscribeRecentSearches(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

export const getRecentSearches = read;
export const getServerRecentSearches = (): readonly string[] => EMPTY;
