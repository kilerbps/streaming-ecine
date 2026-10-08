import { AUTH_COOKIES } from '@ecine/contracts';

/**
 * Cookies `Secure` (et préfixe `__Host-`) : activés par défaut en production. `COOKIE_SECURE=false`
 * ne sert qu'aux builds de production servis en HTTP (CI, vérifications locales) ; il est refusé
 * sur Vercel en production (`server/config.ts`). Règle unique, partagée par `proxy.ts`.
 */
export function cookieSecure(value: string | undefined, nodeEnv: string | undefined): boolean {
  return value === undefined || value === '' ? nodeEnv === 'production' : value === 'true';
}

/** Noms des cookies d'authentification (préfixe __Host- en HTTPS, identique à l'API). */
export function authCookieNames(secure: boolean) {
  const prefix = secure ? '__Host-' : '';
  return { access: `${prefix}${AUTH_COOKIES.access}`, refresh: `${prefix}${AUTH_COOKIES.refresh}` };
}

/**
 * État d'interface non sensible lu par le serveur. Les préférences (thème, sons, vibrations, mode
 * allégé, économie de données) sont dans `lib/preferences.ts` (PREFERENCE_COOKIES).
 */
export const PREF_COOKIES = {
  consent: 'ecine_consent',
  anonId: 'ecine_anon',
  seed: 'ecine_seed',
} as const;
