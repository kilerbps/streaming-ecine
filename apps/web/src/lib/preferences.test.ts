import { describe, expect, it } from 'vitest';
import { detectLite, PREFERENCE_COOKIES, resolvePreferences } from './preferences';

const jar = (values: Record<string, string>) => (name: string) => values[name];

describe('resolvePreferences', () => {
  it('applique les défauts de la charte : Nuit, vibrations et clap actifs, sons de l’interface coupés', () => {
    expect(resolvePreferences(jar({}), null)).toEqual({
      theme: 'dark',
      haptics: true,
      soundClap: true,
      soundUi: false,
      saveData: false,
      perf: 'auto',
      lite: false,
      autoPreviews: true,
    });
  });

  it('coupe les aperçus automatiques seulement sur demande', () => {
    expect(resolvePreferences(jar({ ecine_previews: 'off' }), null).autoPreviews).toBe(false);
    expect(resolvePreferences(jar({ ecine_previews: 'on' }), null).autoPreviews).toBe(true);
  });

  it('prend Automatique par défaut en administration', () => {
    expect(resolvePreferences(jar({}), null, 'auto').theme).toBe('auto');
  });

  it('respecte le thème choisi et ignore une valeur inconnue', () => {
    expect(resolvePreferences(jar({ [PREFERENCE_COOKIES.theme]: 'light' }), null).theme).toBe(
      'light',
    );
    expect(resolvePreferences(jar({ [PREFERENCE_COOKIES.theme]: 'rose' }), null).theme).toBe(
      'dark',
    );
  });

  it('reprend « sons coupés » de la v1 pour le clap, sauf réglage explicite', () => {
    expect(resolvePreferences(jar({ ecine_sound: 'off' }), null).soundClap).toBe(false);
    expect(
      resolvePreferences(jar({ ecine_sound: 'off', [PREFERENCE_COOKIES.soundClap]: 'on' }), null)
        .soundClap,
    ).toBe(true);
  });

  it('suit l’en-tête Save-Data sauf si la personne a choisi', () => {
    expect(resolvePreferences(jar({}), 'on').saveData).toBe(true);
    expect(resolvePreferences(jar({ [PREFERENCE_COOKIES.saveData]: 'off' }), 'on').saveData).toBe(
      false,
    );
  });

  it('active le mode allégé forcé ou détecté, jamais quand il est désactivé', () => {
    expect(resolvePreferences(jar({ [PREFERENCE_COOKIES.perf]: 'on' }), null).lite).toBe(true);
    expect(resolvePreferences(jar({ [PREFERENCE_COOKIES.perfDetected]: 'lite' }), null).lite).toBe(
      true,
    );
    expect(
      resolvePreferences(
        jar({ [PREFERENCE_COOKIES.perf]: 'off', [PREFERENCE_COOKIES.perfDetected]: 'lite' }),
        null,
      ).lite,
    ).toBe(false);
  });
});

describe('detectLite', () => {
  it.each([
    [{ deviceMemory: 2, hardwareConcurrency: 8 }, 'device'],
    [{ deviceMemory: 8, hardwareConcurrency: 4 }, 'device'],
    [{ deviceMemory: 8, hardwareConcurrency: 8, effectiveType: '3g' }, 'network'],
    [{ deviceMemory: 8, hardwareConcurrency: 8, effectiveType: '4g' }, null],
    [{}, null],
  ] as const)('%o → %s', (signals, expected) => {
    expect(detectLite(signals)).toBe(expected);
  });
});
