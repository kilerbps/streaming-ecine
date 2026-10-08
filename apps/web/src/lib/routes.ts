import type { Locale } from '@ecine/contracts';

/** URLs publiques stables (une URL = un contenu). Les slugs n'ont ni accent ni identifiant seul. */
export const routes = {
  home: (l: Locale) => `/${l}`,
  discover: (l: Locale) => `/${l}/decouvrir`,
  whatsNew: (l: Locale) => `/${l}/nouveautes`,
  films: (l: Locale) => `/${l}/films`,
  shorts: (l: Locale) => `/${l}/courts-metrages`,
  film: (l: Locale, slug: string) => `/${l}/films/${slug}`,
  category: (l: Locale, slug: string) => `/${l}/categories/${slug}`,
  people: (l: Locale) => `/${l}/personnes`,
  person: (l: Locale, slug: string) => `/${l}/personnes/${slug}`,
  news: (l: Locale) => `/${l}/actualites`,
  article: (l: Locale, slug: string) => `/${l}/actualites/${slug}`,
  post: (l: Locale, id: string) => `/${l}/publications/${id}`,
  search: (l: Locale, q?: string) => `/${l}/recherche${q ? `?q=${encodeURIComponent(q)}` : ''}`,
  about: (l: Locale) => `/${l}/a-propos`,
  contact: (l: Locale) => `/${l}/contact`,
  privacy: (l: Locale) => `/${l}/confidentialite`,
  terms: (l: Locale) => `/${l}/conditions-generales`,
  legal: (l: Locale) => `/${l}/mentions-legales`,
  cookies: (l: Locale) => `/${l}/cookies`,
  login: (l: Locale) => `/${l}/compte/connexion`,
  register: (l: Locale) => `/${l}/compte/inscription`,
  forgot: (l: Locale) => `/${l}/compte/mot-de-passe-oublie`,
  me: (l: Locale) => `/${l}/moi`,
  myList: (l: Locale) => `/${l}/moi/ma-liste`,
  settings: (l: Locale) => `/${l}/moi/reglages`,
  offline: (l: Locale) => `/${l}/hors-ligne`,
} as const;

/** Redirection interne uniquement (anti open-redirect). */
export function safeInternalPath(value: string | null | undefined, fallback: string): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\'))
    return fallback;
  return value;
}
