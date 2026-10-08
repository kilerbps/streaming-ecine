'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { setHapticsEnabled, vibrate, type HapticName } from '@/lib/haptics';
import {
  detectLite,
  PREFERENCE_COOKIES,
  type PerfSetting,
  type Preferences,
  type ThemeSetting,
} from '@/lib/preferences';
import { playSound, setSoundSettings, type SoundName } from '@/lib/sound';
import { THEME_COLORS } from '@/lib/theme-colors';

export type { Preferences } from '@/lib/preferences';

interface PreferencesContextValue extends Preferences {
  setTheme: (theme: ThemeSetting) => void;
  setHaptics: (on: boolean) => void;
  setSoundClap: (on: boolean) => void;
  setSoundUi: (on: boolean) => void;
  setSaveData: (on: boolean) => void;
  setPerf: (perf: PerfSetting) => void;
  /** Retour après un geste : vibration, et son si la personne l'a choisi. */
  feedback: (name: HapticName) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

const ONE_YEAR = 60 * 60 * 24 * 365;
const SOUNDS = new Set<string>(['like', 'bookmark', 'clap', 'success', 'error']);

/** Préférence d'interface (non sensible) : cookie lu par le serveur au rendu suivant (aucun flash). */
function writeCookie(name: string, value: string | null): void {
  const secure = window.location.protocol === 'https:' ? '; secure' : '';
  const age = value === null ? 0 : ONE_YEAR;
  document.cookie = `${name}=${value ?? ''}; path=/; max-age=${age}; samesite=lax${secure}`;
}

function setHtmlFlag(name: 'perf' | 'savedata', value: string | null): void {
  const html = document.documentElement;
  if (value === null) delete html.dataset[name];
  else html.dataset[name] = value;
}

/** Couleur de la barre du navigateur : celle du thème effectivement affiché. */
function syncThemeColor(theme: ThemeSetting): void {
  const effective =
    theme === 'auto'
      ? window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark'
      : theme;
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.setAttribute('content', THEME_COLORS[effective]);
  }
}

/** Mode allégé en Automatique : mêmes signaux que le script de démarrage (LITE_DETECTION_SCRIPT). */
function detectedLite(): boolean {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { effectiveType?: string };
  };
  const result = detectLite({
    deviceMemory: nav.deviceMemory,
    hardwareConcurrency: nav.hardwareConcurrency,
    effectiveType: nav.connection?.effectiveType,
  });
  if (result === 'device') writeCookie(PREFERENCE_COOKIES.perfDetected, 'lite');
  return result !== null;
}

export function PreferencesProvider({
  initial,
  children,
}: {
  initial: Preferences;
  children: ReactNode;
}) {
  const [prefs, setPrefs] = useState<Preferences>(initial);

  useEffect(() => {
    setSoundSettings({ clap: prefs.soundClap, ui: prefs.soundUi });
  }, [prefs.soundClap, prefs.soundUi]);

  useEffect(() => {
    setHapticsEnabled(prefs.haptics);
  }, [prefs.haptics]);

  // En Automatique, la barre du navigateur suit le thème du système quand il change.
  useEffect(() => {
    if (prefs.theme !== 'auto') return;
    const query = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => syncThemeColor('auto');
    onChange();
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [prefs.theme]);

  const feedback = useCallback((name: HapticName) => {
    vibrate(name);
    if (SOUNDS.has(name)) playSound(name as SoundName);
  }, []);

  const setTheme = useCallback((theme: ThemeSetting) => {
    document.documentElement.dataset.theme = theme;
    syncThemeColor(theme);
    writeCookie(PREFERENCE_COOKIES.theme, theme);
    setPrefs((p) => ({ ...p, theme }));
  }, []);

  const setHaptics = useCallback((haptics: boolean) => {
    writeCookie(PREFERENCE_COOKIES.haptics, haptics ? 'on' : 'off');
    setHapticsEnabled(haptics);
    setPrefs((p) => ({ ...p, haptics }));
    if (haptics) vibrate('tap');
  }, []);

  const setSoundClap = useCallback((soundClap: boolean) => {
    writeCookie(PREFERENCE_COOKIES.soundClap, soundClap ? 'on' : 'off');
    setPrefs((p) => ({ ...p, soundClap }));
  }, []);

  const setSoundUi = useCallback((soundUi: boolean) => {
    writeCookie(PREFERENCE_COOKIES.soundUi, soundUi ? 'on' : 'off');
    setPrefs((p) => ({ ...p, soundUi }));
  }, []);

  const setSaveData = useCallback((saveData: boolean) => {
    writeCookie(PREFERENCE_COOKIES.saveData, saveData ? 'on' : 'off');
    setHtmlFlag('savedata', saveData ? 'on' : null);
    setPrefs((p) => ({ ...p, saveData }));
  }, []);

  const setPerf = useCallback((perf: PerfSetting) => {
    writeCookie(PREFERENCE_COOKIES.perf, perf === 'auto' ? null : perf);
    const lite = perf === 'on' || (perf === 'auto' && detectedLite());
    setHtmlFlag('perf', lite ? 'lite' : null);
    setPrefs((p) => ({ ...p, perf, lite }));
  }, []);

  const value = useMemo(
    () => ({
      ...prefs,
      setTheme,
      setHaptics,
      setSoundClap,
      setSoundUi,
      setSaveData,
      setPerf,
      feedback,
    }),
    [prefs, setTheme, setHaptics, setSoundClap, setSoundUi, setSaveData, setPerf, feedback],
  );
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences doit être utilisé dans PreferencesProvider');
  return ctx;
}
