import 'server-only';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { ApiError } from './api-client';
import { resolveRedirect } from './data';

/** Ancien lien enregistré (slug renommé) : 301, ou 302 si la redirection est temporaire ; sinon 404. */
export async function redirectOrNotFound(path: string): Promise<never> {
  const target = await resolveRedirect(path).catch(() => null);
  if (target) {
    if (target.status === 302) redirect(target.toPath);
    permanentRedirect(target.toPath);
  }
  notFound();
}

/** Erreur « contenu introuvable » de l'API (404, ou 400 pour un identifiant mal formé). */
export function isMissing(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 404 || error.status === 400);
}

/**
 * Charge un contenu ; s'il est introuvable, consulte la table des redirections (ancien slug → 301)
 * avant d'afficher la page 404 : aucun lien publié n'est jamais cassé (FR-133).
 */
export async function loadOrNotFound<T>(load: () => Promise<T>, path: string): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (!isMissing(error)) throw error;
    return redirectOrNotFound(path);
  }
}
