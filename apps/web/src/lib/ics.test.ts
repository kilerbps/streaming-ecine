import { describe, expect, it } from 'vitest';
import { escapeText, foldLine, toIcs } from './ics';

describe('toIcs', () => {
  const ics = toIcs({
    uid: 'a1@e-cine',
    start: new Date('2026-10-16T17:00:00Z'),
    end: new Date('2026-10-16T19:00:00Z'),
    stamp: new Date('2026-10-15T08:00:00Z'),
    title: 'Projection : La Rumba, en plein air',
    location: 'Kinshasa; Gombe',
    description: 'Une soirée.\nEntrée libre.',
    url: 'https://e-cine.example/fr/actualites/projection',
  });

  it('produit un VEVENT en UTC avec des fins de ligne CRLF', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('DTSTART:20261016T170000Z\r\n');
    expect(ics).toContain('DTEND:20261016T190000Z\r\n');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('échappe les virgules, points-virgules et retours à la ligne', () => {
    expect(ics).toContain('SUMMARY:Projection : La Rumba\\, en plein air');
    expect(ics).toContain('LOCATION:Kinshasa\\; Gombe');
    expect(escapeText('a\nb\\c')).toBe('a\\nb\\\\c');
  });

  it('replie les lignes longues à 75 octets sans couper un caractère', () => {
    const folded = foldLine(`SUMMARY:${'é'.repeat(80)}`);
    for (const line of folded.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(folded.replace(/\r\n /g, '')).toBe(`SUMMARY:${'é'.repeat(80)}`);
  });
});
