import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import {
  articleDetailSchema,
  articleSummarySchema,
  categoryOverviewSchema,
  homeSchema,
  personalHomeSchema,
  whatsNewSchema,
  continueWatchingItemSchema,
  feedPageSchema,
  filmDetailSchema,
  filmSummarySchema,
  meSchema,
  pageSchema,
  personDetailSchema,
  personSummarySchema,
  postSchema,
  searchResultsSchema,
  siteSettingsSchema,
  staticPageSchema,
  teamMemberSchema,
  viewerStateSchema,
  type ArticleKind,
  type FilmKind,
  type LikeTargetType,
  type Me,
  type PersonalHome,
} from '@ecine/contracts';
import { z } from 'zod';
import { ApiError, privateRequest, publicGet } from './api-client';
import { readPersonalSignals } from './personalization';
import { serverConfig } from './config';
import { authCookieNames } from './cookie-names';
import { resolvePreferences, type Preferences, type ThemeSetting } from '@/lib/preferences';

/** Lectures publiques (cache Next.js + étiquettes revalidées par l'API, cf. content-events.service.ts). */

export function getFeed(cursor?: string, seed?: string) {
  // Le feed dépend de la graine de visite : durée de cache courte, l'API met l'index en cache.
  return publicGet(feedPageSchema, '/feed', {
    query: { cursor, seed, limit: 12 },
    tags: ['feed'],
    revalidate: 60,
  });
}

export function getFilms(
  params: { kind?: FilmKind; category?: string; cursor?: string; limit?: number } = {},
) {
  return publicGet(pageSchema(filmSummarySchema), '/films', {
    query: { ...params, limit: params.limit ?? 24 },
    tags: ['films'],
  });
}

export const getFilm = cache((slug: string) =>
  publicGet(filmDetailSchema, `/films/${encodeURIComponent(slug)}`, {
    tags: ['films', `film:${slug}`],
  }),
);

/** Accueil en rangées : affiche à la une et rangées calculées par l'API (étiquette `home`). */
export function getHome() {
  return publicGet(homeSchema, '/home', { tags: ['home'], revalidate: 120 });
}

/**
 * Partie personnelle de l'accueil (ADR-0014) : membre → son compte ; visiteur ayant accepté
 * « Personnalisation » → les cookies de l'appareil ; sinon rien.
 */
export async function getPersonalHome(): Promise<PersonalHome | null> {
  if (await getViewer()) {
    return privateRequest(personalHomeSchema, '/home/personal', { method: 'POST', body: {} });
  }
  const signals = await readPersonalSignals();
  if (!signals) return null;
  if (!signals.history.length && !signals.dismissed.length && !signals.tastes.length) return null;
  return privateRequest(personalHomeSchema, '/home/personal', { method: 'POST', body: signals });
}

/** Nouveautés : films annoncés et événements à venir (étiquette `whats-new`). */
export function getWhatsNew() {
  return publicGet(whatsNewSchema, '/whats-new', { tags: ['whats-new'], revalidate: 120 });
}

export function getCategories() {
  return publicGet(z.array(categoryOverviewSchema), '/categories', {
    tags: ['categories'],
    revalidate: 600,
  });
}

export function getPeople(cursor?: string) {
  return publicGet(pageSchema(personSummarySchema), '/people', {
    query: { cursor, limit: 48 },
    tags: ['people'],
  });
}

export const getPerson = cache((slug: string) =>
  publicGet(personDetailSchema, `/people/${encodeURIComponent(slug)}`, {
    tags: ['people', `person:${slug}`],
  }),
);

export function getArticles(params: { kind?: ArticleKind; cursor?: string; limit?: number } = {}) {
  return publicGet(pageSchema(articleSummarySchema), '/articles', {
    query: { ...params, limit: params.limit ?? 12 },
    tags: ['articles'],
  });
}

export const getArticle = cache((slug: string) =>
  publicGet(articleDetailSchema, `/articles/${encodeURIComponent(slug)}`, {
    tags: ['articles', `article:${slug}`],
  }),
);

export const getPost = cache((id: string) =>
  publicGet(postSchema, `/posts/${encodeURIComponent(id)}`, { tags: ['feed'] }),
);

export const getStaticPage = cache((slug: string) =>
  publicGet(staticPageSchema, `/pages/${encodeURIComponent(slug)}`, {
    tags: ['pages', `page:${slug}`],
    revalidate: 600,
  }),
);

export function getTeam() {
  return publicGet(z.array(teamMemberSchema), '/team', { tags: ['team'], revalidate: 600 });
}

export const getSiteSettings = cache(() =>
  publicGet(siteSettingsSchema, '/site-settings', { tags: ['settings'], revalidate: 600 }),
);

export function search(q: string, limit = 8) {
  return publicGet(searchResultsSchema, '/search', { query: { q, limit }, revalidate: 60 });
}

/** Ancienne URL → nouvelle (changement de slug). null si aucune redirection. */
export async function resolveRedirect(
  path: string,
): Promise<{ toPath: string; status: number } | null> {
  try {
    return await publicGet(
      z.object({ toPath: z.string(), status: z.number() }),
      '/redirects/resolve',
      {
        query: { path },
        tags: ['redirects'],
        revalidate: 300,
      },
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function getSitemapData() {
  const entry = z.object({ slug: z.string(), updatedAt: z.string() });
  const schema = z.object({
    films: z.array(entry),
    people: z.array(entry),
    articles: z.array(entry),
    pages: z.array(entry),
    categories: z.array(entry),
  });
  return publicGet(schema, '/sitemap-data', { tags: ['sitemap'], revalidate: 3600 });
}

/** Lectures privées (jamais en cache partagé). */

async function hasSession(): Promise<boolean> {
  const jar = await cookies();
  const names = authCookieNames(serverConfig().COOKIE_SECURE);
  return jar.has(names.access) || jar.has(names.refresh);
}

/** Visiteur connecté (une seule requête par rendu). */
export const getViewer = cache(async (): Promise<Me | null> => {
  if (!(await hasSession())) return null;
  try {
    return await privateRequest(meSchema, '/me');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
});

export async function getFilmViewerState(filmId: string) {
  if (!(await getViewer())) return null;
  return privateRequest(viewerStateSchema, `/me/films/${encodeURIComponent(filmId)}/state`);
}

export async function getLikedIds(type: LikeTargetType, ids: string[]): Promise<string[]> {
  if (ids.length === 0 || !(await getViewer())) return [];
  const res = await privateRequest(z.object({ ids: z.array(z.string()) }), '/me/likes', {
    query: { type, ids: ids.join(',') },
  });
  return res.ids;
}

export async function getBookmarks(cursor?: string) {
  return privateRequest(pageSchema(filmSummarySchema), '/me/bookmarks', {
    query: { cursor, limit: 24 },
  });
}

/** Rappels en attente du membre connecté (films annoncés), vide pour un visiteur. */
export async function getReminders() {
  if (!(await getViewer())) return [];
  return privateRequest(z.array(filmSummarySchema), '/me/reminders');
}

export async function getContinueWatching() {
  if (!(await getViewer())) return [];
  return privateRequest(z.array(continueWatchingItemSchema), '/me/continue-watching');
}

/**
 * Préférences d'interface lues côté serveur (pas de flash au chargement). `defaultTheme` : Nuit sur
 * le site, Automatique en administration (D-09).
 */
export async function getPreferences(defaultTheme: ThemeSetting = 'dark'): Promise<Preferences> {
  const [jar, head] = await Promise.all([cookies(), headers()]);
  return resolvePreferences((name) => jar.get(name)?.value, head.get('save-data'), defaultTheme);
}
