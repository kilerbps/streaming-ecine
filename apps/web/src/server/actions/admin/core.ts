import 'server-only';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { hasRole, type Role } from '@ecine/contracts';
import type { z } from 'zod';
import { PROBLEM } from '@/lib/problem-types';
import { safeInternalPath } from '@/lib/routes';
import { ApiError, privateRequest, type PrivateRequestOptions } from '../../api-client';
import { getViewer } from '../../data';
import { fromError, ok, type ActionResult } from '../result';

/**
 * Outils serveur de l'administration (règle R1) :
 * - `adminLoad` : lecture dans un Server Component, les refus attendus deviennent des valeurs affichables ;
 * - `adminMutation` : écriture depuis une Server Action, revalidation des écrans d'administration.
 * L'API reste l'autorité (rôle relu en base, 2FA) : ces fonctions ne font que traduire ses réponses.
 */

export type LoadFailure = { ok: false; kind: 'mfa' | 'forbidden' | 'unavailable'; message: string };
export type Loaded<T> = { ok: true; data: T } | LoadFailure;

/** URL de connexion avec retour vers l'écran demandé (chemin posé par proxy.ts). */
export async function adminLoginUrl(): Promise<string> {
  const path = (await headers()).get('x-pathname');
  const back = path && path.startsWith('/admin') ? safeInternalPath(path, '/admin') : '/admin';
  return `/fr/compte/connexion?retour=${encodeURIComponent(back)}`;
}

export async function adminLoad<T extends z.ZodType>(
  schema: T,
  path: string,
  query?: PrivateRequestOptions['query'],
): Promise<Loaded<z.infer<T>>> {
  try {
    const data = (await privateRequest(schema, path, { query })) as z.infer<T>;
    return { ok: true, data };
  } catch (error) {
    if (!(error instanceof ApiError)) {
      return {
        ok: false,
        kind: 'unavailable',
        message: 'Le serveur ne répond pas pour le moment. Réessayez dans un instant.',
      };
    }
    if (error.status === 401) redirect(await adminLoginUrl());
    if (error.status === 404) notFound();
    if (error.problem.type === PROBLEM.mfaRequired) {
      return {
        ok: false,
        kind: 'mfa',
        message: error.problem.detail ?? 'Double authentification requise.',
      };
    }
    if (error.status === 403) {
      return {
        ok: false,
        kind: 'forbidden',
        message: error.problem.detail ?? 'Votre rôle ne permet pas d’accéder à cet écran.',
      };
    }
    return {
      ok: false,
      kind: 'unavailable',
      message: error.problem.detail ?? 'Le service est momentanément indisponible.',
    };
  }
}

/** Vrai si le visiteur connecté a au moins ce rôle (affichage seulement : l'API décide). */
export async function viewerHasRole(minimum: Role): Promise<boolean> {
  const viewer = await getViewer();
  return Boolean(viewer && hasRole(viewer.role, minimum));
}

const UNREACHABLE = 'Le serveur ne répond pas. Vérifiez votre connexion puis réessayez.';

/** Exécute une écriture et revalide les écrans indiqués ; les erreurs deviennent des valeurs lisibles. */
export async function adminMutation<T>(
  run: () => Promise<T>,
  revalidate: string[] = [],
): Promise<ActionResult<T>> {
  let data: T;
  try {
    data = await run();
  } catch (error) {
    if (error instanceof ApiError) return fromError(error);
    return { ok: false, code: 'unknown', error: UNREACHABLE };
  }
  for (const path of new Set(revalidate)) revalidatePath(path);
  return ok(data);
}

/** Lecture depuis une Server Action (recherche, pagination, suivi) : pas de revalidation. */
export async function adminQuery<T>(run: () => Promise<T>): Promise<ActionResult<T>> {
  return adminMutation(run, []);
}

export const enc = encodeURIComponent;
