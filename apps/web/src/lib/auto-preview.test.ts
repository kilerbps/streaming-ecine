import { describe, expect, it } from 'vitest';
import { previewMode, type PreviewContext } from './auto-preview';

const base: PreviewContext = {
  autoPreviews: true,
  lite: false,
  saveData: false,
  reducedMotion: false,
  connection: { effectiveType: '4g' },
};

describe('aperçus automatiques', () => {
  it('démarrent en 4G ou en Wi-Fi détectés', () => {
    expect(previewMode(base)).toBe('now');
    expect(previewMode({ ...base, connection: { type: 'wifi', effectiveType: '3g' } })).toBe('now');
  });

  it('ne démarrent jamais en 3G, en économie de données ou en mode allégé', () => {
    expect(previewMode({ ...base, connection: { effectiveType: '3g' } })).toBe('never');
    expect(previewMode({ ...base, connection: { effectiveType: '4g', saveData: true } })).toBe(
      'never',
    );
    expect(previewMode({ ...base, saveData: true })).toBe('never');
    expect(previewMode({ ...base, lite: true })).toBe('never');
  });

  it('respectent le réglage et le mouvement réduit', () => {
    expect(previewMode({ ...base, autoPreviews: false })).toBe('never');
    expect(previewMode({ ...base, reducedMotion: true })).toBe('never');
  });

  it("attendent 2 s de présence quand le réseau n'est pas connu (iPhone)", () => {
    expect(previewMode({ ...base, connection: null })).toBe('delayed');
  });
});
