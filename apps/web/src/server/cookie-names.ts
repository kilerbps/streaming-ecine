import { AUTH_COOKIES } from '@ecine/contracts';

/** Noms des cookies d'authentification (préfixe __Host- en HTTPS, identique à l'API). */
export function authCookieNames(secure: boolean) {
  const prefix = secure ? '__Host-' : '';
  return { access: `${prefix}${AUTH_COOKIES.access}`, refresh: `${prefix}${AUTH_COOKIES.refresh}` };
}

/** Préférences et état d'interface (non sensibles, lisibles côté serveur pour éviter le flash). */
export const PREF_COOKIES = {
  theme: 'ecine_theme',
  sound: 'ecine_sound',
  saveData: 'ecine_savedata',
  consent: 'ecine_consent',
  anonId: 'ecine_anon',
  seed: 'ecine_seed',
} as const;
