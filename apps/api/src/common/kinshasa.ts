const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Kinshasa',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Jour calendaire à Kinshasa (UTC+1, sans heure d'été), au format AAAA-MM-JJ. */
export function kinshasaDay(date: Date): string {
  return dayFormatter.format(date);
}

/** Décale un jour AAAA-MM-JJ de `days` jours. */
export function shiftDay(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
