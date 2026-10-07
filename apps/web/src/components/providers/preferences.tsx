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
import { vibrate } from '@/lib/haptics';
import { playSound, setSoundEnabled, type SoundName } from '@/lib/sound';

export interface Preferences {
  theme: 'dark' | 'light';
  sound: boolean;
  saveData: boolean;
}

interface PreferencesContextValue extends Preferences {
  setTheme: (theme: Preferences['theme']) => void;
  setSound: (on: boolean) => void;
  setSaveData: (on: boolean) => void;
  /** Retour sensoriel (son + vibration) après un geste de l'utilisateur. */
  feedback: (name: SoundName) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

const COOKIE_NAMES = {
  theme: 'ecine_theme',
  sound: 'ecine_sound',
  saveData: 'ecine_savedata',
} as const;
const ONE_YEAR = 60 * 60 * 24 * 365;

/** Préférence d'interface (non sensible) : cookie lu par le serveur au rendu suivant (aucun flash). */
function writeCookie(name: string, value: string): void {
  const secure = window.location.protocol === 'https:' ? '; secure' : '';
  document.cookie = `${name}=${value}; path=/; max-age=${ONE_YEAR}; samesite=lax${secure}`;
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
    setSoundEnabled(prefs.sound);
  }, [prefs.sound]);

  const feedback = useCallback(
    (name: SoundName) => {
      playSound(name);
      vibrate(name, prefs.sound);
    },
    [prefs.sound],
  );

  const setTheme = useCallback((theme: Preferences['theme']) => {
    document.documentElement.dataset.theme = theme;
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    if (bg) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
    writeCookie(COOKIE_NAMES.theme, theme);
    setPrefs((p) => ({ ...p, theme }));
    playSound('toggle');
  }, []);

  const setSound = useCallback((sound: boolean) => {
    writeCookie(COOKIE_NAMES.sound, sound ? 'on' : 'off');
    setSoundEnabled(sound);
    setPrefs((p) => ({ ...p, sound }));
    if (sound) playSound('toggle');
  }, []);

  const setSaveData = useCallback((saveData: boolean) => {
    writeCookie(COOKIE_NAMES.saveData, saveData ? 'on' : 'off');
    setPrefs((p) => ({ ...p, saveData }));
    playSound('toggle');
  }, []);

  const value = useMemo(
    () => ({ ...prefs, setTheme, setSound, setSaveData, feedback }),
    [prefs, setTheme, setSound, setSaveData, feedback],
  );
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences doit être utilisé dans PreferencesProvider');
  return ctx;
}
