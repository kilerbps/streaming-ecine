import { describe, expect, it } from 'vitest';
import { capImageDensity } from './image-sizes';

describe('capImageDensity', () => {
  it('réduit seulement la taille mobile des écrans très denses', () => {
    expect(capImageDensity('(min-width: 1056px) 30vw, 60vw')).toBe(
      '(min-width: 1056px) 30vw, (min-resolution: 2.5dppx) calc(60vw * 0.72), 60vw',
    );
  });

  it('garde les calc() intacts', () => {
    expect(capImageDensity('(min-width: 1056px) 100vw, calc(100vw - 32px)')).toBe(
      '(min-width: 1056px) 100vw, (min-resolution: 2.5dppx) calc(calc(100vw - 32px) * 0.72), calc(100vw - 32px)',
    );
  });

  it('économie de données : environ 1× sur tous les écrans denses', () => {
    expect(capImageDensity('100vw', { saveData: true })).toBe(
      '(min-resolution: 2.5dppx) calc(100vw * 0.4), (min-resolution: 1.5dppx) calc(100vw * 0.6), 100vw',
    );
  });

  it('forme inattendue : inchangée', () => {
    expect(capImageDensity('(min-width: 600px) 50vw')).toBe('(min-width: 600px) 50vw');
  });
});
