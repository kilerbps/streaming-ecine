import { describe, expect, it } from 'vitest';
import {
  TASTES_LATER_SECONDS,
  afterTastesPrompt,
  dueTastesPrompt,
  suggestTastes,
} from './tastes-prompt';

const NOW = 1_800_000_000;

describe('feuille des goûts', () => {
  it("n'est proposée qu'après un premier film, et plus après la décision", () => {
    expect(dueTastesPrompt(null, NOW)).toBeNull();
    expect(dueTastesPrompt({ s: 'due', c: ['drame'] }, NOW)).toEqual(['drame']);
    expect(dueTastesPrompt({ s: 'done' }, NOW)).toBeNull();
  });

  it('« Plus tard » la repousse de 7 jours, une seule fois', () => {
    const later = afterTastesPrompt({ s: 'due', c: ['drame'] }, 'later', NOW);
    expect(later).toEqual({ s: 'later', c: ['drame'], u: NOW + TASTES_LATER_SECONDS });
    expect(dueTastesPrompt(later, NOW + TASTES_LATER_SECONDS - 1)).toBeNull();
    expect(dueTastesPrompt(later, NOW + TASTES_LATER_SECONDS)).toEqual(['drame']);
    // Seconde présentation : « Plus tard » ou fermeture la clôt.
    expect(afterTastesPrompt(later, 'later', NOW + TASTES_LATER_SECONDS)).toEqual({ s: 'done' });
  });

  it('enregistrer les goûts la clôt', () => {
    expect(afterTastesPrompt({ s: 'due', c: [] }, 'saved', NOW)).toEqual({ s: 'done' });
  });

  it('pré-choisit les genres du film, complétés par les catégories les plus fournies', () => {
    const categories = [
      { slug: 'drame', filmCount: 4 },
      { slug: 'comedie', filmCount: 9 },
      { slug: 'musique', filmCount: 2 },
      { slug: 'documentaire', filmCount: 7 },
    ];
    expect(suggestTastes(['musique', 'disparue'], categories)).toEqual([
      'musique',
      'comedie',
      'documentaire',
    ]);
    expect(suggestTastes(['drame', 'musique', 'comedie', 'documentaire'], categories)).toEqual([
      'drame',
      'musique',
      'comedie',
    ]);
    expect(suggestTastes([], [])).toEqual([]);
  });
});
