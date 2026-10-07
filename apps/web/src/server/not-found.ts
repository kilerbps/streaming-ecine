import 'server-only';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { ApiError } from './api-client';
import { resolveRedirect } from './data';

/**
 * Charge un contenu ; s'il est introuvable, consulte la table des redirections (ancien slug → 301)
 * avant d'afficher la page 404 : aucun lien publié n'est jamais cassé (FR-133).
 */
export async function loadOrNotFound<T>(load: () => Promise<T>, path: string): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (!(error instanceof ApiError) || (error.status !== 404 && error.status !== 400)) throw error;
    const target = await resolveRedirect(path);
    if (target) {
      if (target.status === 302) redirect(target.toPath);
      permanentRedirect(target.toPath);
    }
    notFound();
  }
}
