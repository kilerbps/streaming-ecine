import { ADMIN_TIME_ZONE, KINSHASA_OFFSET } from './config';

/** Formats de l'administration (heure de Kinshasa, identique côté serveur et navigateur). */

const short = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: ADMIN_TIME_ZONE,
});
const day = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export function formatShort(iso: string | null | undefined): string {
  return iso ? short.format(new Date(iso)) : '';
}

/** Libellé d'un jour « AAAA-MM-JJ » des statistiques (jours UTC). */
export function formatDay(key: string): string {
  return day.format(new Date(`${key}T00:00:00Z`));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1).replace('.', ',')} Mo`;
  return `${(bytes / 1024 ** 3).toFixed(2).replace('.', ',')} Go`;
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(value);
}

/** ISO → valeur d'un champ `datetime-local` à l'heure de Kinshasa. */
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const shifted = new Date(date.getTime() + 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 16);
}

/** Valeur d'un champ `datetime-local` (heure de Kinshasa) → ISO 8601 avec décalage. */
export function localInputToIso(value: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}:00${KINSHASA_OFFSET}`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** Empreinte courte d'une valeur (clé de remontage d'un formulaire quand l'API ne fournit pas `updatedAt`). */
export function fingerprint(value: unknown): string {
  const text = JSON.stringify(value) ?? '';
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
}

/** Slug proposé à partir d'un titre : minuscules, sans accent, mots séparés par des tirets. */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
    .replace(/-+$/g, '');
}
