/** Durée lisible : 5 820 s → « 1 h 37 », 840 s → « 14 min ». */
export function formatRuntime(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} h` : `${hours} h ${String(minutes).padStart(2, '0')}`;
}

/** Timecode du lecteur : 75 → « 1:15 », 3725 → « 1:02:05 ». */
export function formatTimecode(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/**
 * Saisie d'un horodatage : « 1:32:10 », « 88:40 » (minutes:secondes) ou « 90 » (minutes) → secondes ;
 * vide ou illisible → aucune valeur.
 */
export function parseTimecode(value: string): number | undefined {
  const parts = value.trim().split(':');
  if (parts.length > 3 || parts.some((p) => !/^\d+$/.test(p.trim()))) return undefined;
  const numbers = parts.map((p) => Number(p.trim()));
  const seconds =
    numbers.length === 1 ? numbers[0]! * 60 : numbers.reduce((total, part) => total * 60 + part, 0);
  return seconds > 0 ? seconds : undefined;
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Africa/Kinshasa',
});
const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Africa/Kinshasa',
});

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

/** Méta d'une tuile film : « 2026 · 1 h 37 ». */
export function filmMeta(year: number | null, runtimeSec: number | null): string {
  return [year, formatRuntime(runtimeSec)].filter(Boolean).join(' · ');
}

/** Texte brut tronqué proprement (descriptions SEO, extraits). */
export function truncate(text: string, max: number): string {
  const clean = text
    .replace(/[#*_>`[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ') > max * 0.6 ? cut.lastIndexOf(' ') : cut.length)}…`;
}

/** Initiales du nom affiché (avatars à initiales). */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
