/**
 * Fichier iCalendar (RFC 5545) d'un événement, pour « Ajouter au calendrier » : lignes CRLF, dates
 * en UTC, texte échappé, lignes repliées à 75 octets.
 */
export interface CalendarEvent {
  uid: string;
  start: Date;
  end: Date;
  title: string;
  description?: string | null;
  location?: string | null;
  url: string;
  stamp?: Date;
}

const utc = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

/** Échappement des valeurs texte : barre oblique inverse, point-virgule, virgule, retour à la ligne. */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Repli à 75 octets UTF-8 au plus par ligne ; les suites commencent par une espace. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

export function toIcs(event: CalendarEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//E-Ciné//Nouveautés//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${utc(event.stamp ?? new Date())}`,
    `DTSTART:${utc(event.start)}`,
    `DTEND:${utc(event.end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    event.location ? `LOCATION:${escapeText(event.location)}` : null,
    event.description ? `DESCRIPTION:${escapeText(event.description)}` : null,
    `URL:${event.url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter((line): line is string => line !== null);
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}
