import { describe, expect, it } from 'vitest';
import { cropKey, objectPosition } from './image-framing';

describe('cropKey', () => {
  it('traduit les ratios d’affichage en clés de recadrage', () => {
    expect(cropKey('2/3')).toBe('2:3');
    expect(cropKey('16/9')).toBe('16:9');
    expect(cropKey('3/2')).toBeNull();
    expect(cropKey(null)).toBeNull();
  });
});

describe('objectPosition', () => {
  it('ne cadre rien sans point focal ni recadrage', () => {
    expect(objectPosition({ focal: null, crops: null }, '2:3')).toBeUndefined();
  });

  it('suit le point focal', () => {
    expect(objectPosition({ focal: { x: 0.3, y: 0.25 }, crops: null }, '2:3')).toBe('30% 25%');
  });

  it('préfère le recadrage du ratio affiché au point focal', () => {
    const crops = { '2:3': { x: 0.25, y: 0, w: 0.5, h: 1 } };
    // x / (1 − w) = 0.25 / 0.5 = 50 % ; toute la hauteur → centré.
    expect(objectPosition({ focal: { x: 0.9, y: 0.9 }, crops }, '2:3')).toBe('50% 50%');
    // Recadrage collé à droite.
    expect(
      objectPosition(
        { focal: null, crops: { '16:9': { x: 0.4, y: 0.1, w: 0.6, h: 0.8 } } },
        '16:9',
      ),
    ).toBe('100% 50%');
  });

  it('se rabat sur le point focal pour un ratio sans recadrage', () => {
    const crops = { '2:3': { x: 0.25, y: 0, w: 0.5, h: 1 } };
    expect(objectPosition({ focal: { x: 0.6, y: 0.2 }, crops }, '9:16')).toBe('60% 20%');
  });
});
