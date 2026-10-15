'use server';

import {
  adminCategorySchema,
  adminHomeSchema,
  adminListQuerySchema,
  adminTeamMemberSchema,
  categoryInputSchema,
  homeInputSchema,
  idSchema,
  pageSchema,
  redirectInputSchema,
  redirectSchema,
  siteSettingsInputSchema,
  siteSettingsSchema,
  teamMemberInputSchema,
  type Page,
  type Redirect,
} from '@ecine/contracts';
import { z } from 'zod';
import { privateRequest } from '../../api-client';
import { invalid, type ActionResult } from '../result';
import { adminMutation, adminQuery, enc } from './core';

/** Référentiels et réglages du site : catégories, équipe, redirections, paramètres. */

const DELETE = { method: 'DELETE' as const, query: { confirm: 'true' } };

// ——— Catégories ———

export async function saveCategoryAction(id: string | null, input: unknown): Promise<ActionResult> {
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (id !== null && !idSchema.safeParse(id).success)
    return { ok: false, code: 'validation', error: 'Identifiant invalide.' };
  return adminMutation(async () => {
    await privateRequest(
      adminCategorySchema,
      id ? `/admin/categories/${enc(id)}` : '/admin/categories',
      {
        method: id ? 'PATCH' : 'POST',
        body: parsed.data,
      },
    );
    return null;
  }, ['/admin/categories']);
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  const i = idSchema.safeParse(id);
  if (!i.success) return invalid(i.error);
  return adminMutation(
    () => privateRequest(null, `/admin/categories/${enc(i.data)}`, DELETE),
    ['/admin/categories'],
  );
}

// ——— Équipe ———

export async function saveTeamMemberAction(
  id: string | null,
  input: unknown,
): Promise<ActionResult> {
  const parsed = teamMemberInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (id !== null && !idSchema.safeParse(id).success)
    return { ok: false, code: 'validation', error: 'Identifiant invalide.' };
  return adminMutation(async () => {
    await privateRequest(adminTeamMemberSchema, id ? `/admin/team/${enc(id)}` : '/admin/team', {
      method: id ? 'PATCH' : 'POST',
      body: parsed.data,
    });
    return null;
  }, ['/admin/equipe']);
}

/** Réordonne l'équipe : chaque membre reçoit sa nouvelle position (fiche complète renvoyée à l'API). */
export async function reorderTeamAction(updates: unknown): Promise<ActionResult> {
  const parsed = z
    .array(z.object({ id: idSchema, input: teamMemberInputSchema }))
    .min(1)
    .max(100)
    .safeParse(updates);
  if (!parsed.success) return invalid(parsed.error);
  return adminMutation(async () => {
    for (const { id, input } of parsed.data) {
      await privateRequest(adminTeamMemberSchema, `/admin/team/${enc(id)}`, {
        method: 'PATCH',
        body: input,
      });
    }
    return null;
  }, ['/admin/equipe']);
}

export async function deleteTeamMemberAction(id: string): Promise<ActionResult> {
  const i = idSchema.safeParse(id);
  if (!i.success) return invalid(i.error);
  return adminMutation(
    () => privateRequest(null, `/admin/team/${enc(i.data)}`, DELETE),
    ['/admin/equipe'],
  );
}

// ——— Redirections ———

export async function createRedirectAction(input: unknown): Promise<ActionResult> {
  const parsed = redirectInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return adminMutation(async () => {
    await privateRequest(redirectSchema, '/admin/redirects', { method: 'POST', body: parsed.data });
    return null;
  }, ['/admin/redirections']);
}

export async function deleteRedirectAction(id: string): Promise<ActionResult> {
  const i = idSchema.safeParse(id);
  if (!i.success) return invalid(i.error);
  return adminMutation(
    () => privateRequest(null, `/admin/redirects/${enc(i.data)}`, DELETE),
    ['/admin/redirections'],
  );
}

const redirectPageSchema = adminListQuerySchema
  .pick({ q: true })
  .extend({ cursor: z.string().min(1).max(512) });

export async function loadRedirectsAction(query: unknown): Promise<ActionResult<Page<Redirect>>> {
  const parsed = redirectPageSchema.safeParse(query);
  if (!parsed.success) return invalid(parsed.error);
  return adminQuery(() =>
    privateRequest(pageSchema(redirectSchema), '/admin/redirects', {
      query: { ...parsed.data, limit: 25 },
    }),
  );
}

// ——— Paramètres du site ———

export async function saveSettingsAction(input: unknown): Promise<ActionResult> {
  const parsed = siteSettingsInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return adminMutation(async () => {
    await privateRequest(siteSettingsSchema, '/admin/site-settings', {
      method: 'PATCH',
      body: parsed.data,
    });
    return null;
  }, ['/admin/parametres']);
}

// ——— Accueil ———

/** Programmation de l'accueil (affiche à la une, rangées éditoriales, talents), en une fois. */
export async function saveHomeAction(input: unknown): Promise<ActionResult> {
  const parsed = homeInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return adminMutation(async () => {
    await privateRequest(adminHomeSchema, '/admin/home', { method: 'PUT', body: parsed.data });
    return null;
  }, ['/admin/accueil']);
}
