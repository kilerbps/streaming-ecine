/**
 * Préférences d'interface, lues par le serveur (aucun flash) et modifiées par le client. Charte
 * « Nuit de Kin » : thème Nuit par défaut avec Automatique proposé (D-09) ; vibrations, son du clap
 * et sons de l'interface réglés séparément, sons de l'interface coupés par défaut (D-08) ; mode
 * allégé détecté ou forcé (docs/design/03-experience-native.md, Mode allégé).
 */
export type ThemeSetting = 'dark' | 'light' | 'auto';
export type PerfSetting = 'auto' | 'on' | 'off';

export interface Preferences {
  theme: ThemeSetting;
  haptics: boolean;
  soundClap: boolean;
  soundUi: boolean;
  /** Économie de données effective (réglage, sinon en-tête `Save-Data` du navigateur). */
  saveData: boolean;
  /** Réglage du mode allégé ; `auto` = détection de l'appareil et du réseau. */
  perf: PerfSetting;
  /** Mode allégé effectif au rendu serveur (réglage, sinon détection mémorisée). */
  lite: boolean;
}

/** Cookies d'interface (non sensibles, `SameSite=Lax`, un an). */
export const PREFERENCE_COOKIES = {
  theme: 'ecine_theme',
  haptics: 'ecine_haptics',
  soundClap: 'ecine_sound_clap',
  soundUi: 'ecine_sound_ui',
  /** Ancien réglage unique des sons (v1) : seul son « off » est repris, pour le clap. */
  legacySound: 'ecine_sound',
  saveData: 'ecine_savedata',
  perf: 'ecine_perf',
  /** Posé par la détection automatique (appareil modeste) pour les rendus suivants. */
  perfDetected: 'ecine_perf_auto',
} as const;

type CookieReader = (name: string) => string | undefined;

/** Préférences effectives à partir des cookies et de l'en-tête `Save-Data` (`defaultTheme` : site Nuit, admin Automatique). */
export function resolvePreferences(
  read: CookieReader,
  saveDataHeader: string | null,
  defaultTheme: ThemeSetting = 'dark',
): Preferences {
  const theme = read(PREFERENCE_COOKIES.theme);
  const soundClap = read(PREFERENCE_COOKIES.soundClap);
  const saveData = read(PREFERENCE_COOKIES.saveData);
  const perfCookie = read(PREFERENCE_COOKIES.perf);
  const perf: PerfSetting = perfCookie === 'on' || perfCookie === 'off' ? perfCookie : 'auto';
  return {
    theme: theme === 'dark' || theme === 'light' || theme === 'auto' ? theme : defaultTheme,
    haptics: read(PREFERENCE_COOKIES.haptics) !== 'off',
    soundClap:
      soundClap === undefined
        ? read(PREFERENCE_COOKIES.legacySound) !== 'off'
        : soundClap !== 'off',
    soundUi: read(PREFERENCE_COOKIES.soundUi) === 'on',
    saveData:
      saveData === undefined ? saveDataHeader?.trim().toLowerCase() === 'on' : saveData === 'on',
    perf,
    lite: perf === 'on' || (perf === 'auto' && read(PREFERENCE_COOKIES.perfDetected) === 'lite'),
  };
}

/** Signaux d'un appareil ou d'un réseau modeste (API Chromium ; ailleurs, rien n'est détecté). */
export interface DeviceSignals {
  deviceMemory?: number;
  hardwareConcurrency?: number;
  effectiveType?: string;
}

/**
 * `device` : appareil modeste (mémorisé en cookie) ; `network` : réseau lent (pour la session).
 * Seuils de la charte : mémoire ≤ 2 Go ou 4 cœurs au plus ; connexion 3G ou moins.
 */
export function detectLite(signals: DeviceSignals): 'device' | 'network' | null {
  if (
    (signals.deviceMemory !== undefined && signals.deviceMemory <= 2) ||
    (signals.hardwareConcurrency !== undefined && signals.hardwareConcurrency <= 4)
  ) {
    return 'device';
  }
  if (signals.effectiveType && ['slow-2g', '2g', '3g'].includes(signals.effectiveType)) {
    return 'network';
  }
  return null;
}

/**
 * Script exécuté avant l'affichage (nonce CSP) quand le mode allégé est en Automatique : il pose
 * `data-perf="lite"` dès la première image. Même logique que `detectLite`, écrite en clair car le
 * script est injecté tel quel dans la page.
 */
export const LITE_DETECTION_SCRIPT = `(function(){try{var n=navigator,c=n.connection||{},d=document.documentElement;var dev=(n.deviceMemory!==undefined&&n.deviceMemory<=2)||(n.hardwareConcurrency!==undefined&&n.hardwareConcurrency<=4);var net=['slow-2g','2g','3g'].indexOf(c.effectiveType)>=0;if(dev||net){d.dataset.perf='lite'}if(dev){document.cookie='${PREFERENCE_COOKIES.perfDetected}=lite; path=/; max-age=31536000; samesite=lax'+(location.protocol==='https:'?'; secure':'')}}catch(e){}})();`;
