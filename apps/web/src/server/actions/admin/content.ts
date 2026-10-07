'use server';

import {
  adminListQuerySchema,
  adminRowSchema,
  articleInputSchema,
  filmInputSchema,
  idSchema,
  pageSchema,
  personInputSchema,
  postInputSchema,
  scheduleInputSchema,
  staticPageInputSchema,
  type AdminRow,
  type Page,
} from '@ecine/contracts';
import { z } from 'zod';
import { CONTENT, type ContentKind, type ContentOp } from '@/components/admin/config';
import { privateRequest } from '../../api-client';
import { invalid, type ActionResult } from '../result';
import { adminMutation, adminQuery, enc } from './core';

/**
 * Contenus éditoriaux (films, personnes, actualités, publications, pages) : enregistrement, changements
 * d'état, pagination des listes et recherches des sélecteurs. Entrées validées par les schémas du contrat
 * AVANT l'appel à l'API (qui revalide de son côté).
 */

const kindSchema = z.enum(['films', 'people', 'articles', 'posts', 'pages']);
const opSchema = z.enum(['publish', 'schedule', 'unpublish', 'archive', 'delete', 'restore']);

const INPUT_SCHEMAS = {
  films: filmInputSchema,
  people: personInputSchema,
  articles: articleInputSchema,
  posts: postInputSchema,
  pages: staticPageInputSchema,
} as const;

function screens(kind: ContentKind, id?: string): string[] {
  const base = CONTENT[kind].ui;
  return ['/admin', base, ...(id ? [`${base}/${id}`] : [])];
}

/** Création (id null) ou mise à jour d'un contenu ; renvoie son identifiant. */
export async function saveContentAction(
  kind: ContentKind,
  id: string | null,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const k = kindSchema.safeParse(kind);
  if (!k.success) return invalid(k.error);
  if (id !== null) {
    const parsedId = idSchema.safeParse(id);
    if (!parsedId.success) return invalid(parsedId.error);
  }
  const parsed = INPUT_SCHEMAS[k.data].safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const api = CONTENT[k.data].api;
  return adminMutation(
    async () => {
      const saved = await privateRequest(
        z.object({ id: z.string() }),
        id ? `${api}/${enc(id)}` : api,
        {
          method: id ? 'PATCH' : 'POST',
          body: parsed.data,
        },
      );
      return { id: saved.id };
    },
    screens(k.data, id ?? undefined),
  );
}

/** Publier, planifier, dépublier, archiver, supprimer (corbeille, `confirm=true`) ou restaurer. */
export async function changeStateAction(
  kind: ContentKind,
  id: string,
  op: ContentOp,
  publishAt?: string,
): Promise<ActionResult> {
  const k = kindSchema.safeParse(kind);
  const o = opSchema.safeParse(op);
  const i = idSchema.safeParse(id);
  if (!k.success) return invalid(k.error);
  if (!o.success) return invalid(o.error);
  if (!i.success) return invalid(i.error);
  const config = CONTENT[k.data];
  if (!config.ops.includes(o.data)) {
    return {
      ok: false,
      code: 'validation',
      error: 'Cette action n’est pas disponible pour ce type de contenu.',
    };
  }
  const path = `${config.api}/${enc(i.data)}`;

  let request: () => Promise<null>;
  switch (o.data) {
    case 'schedule': {
      const body = scheduleInputSchema.safeParse({ publishAt });
      if (!body.success) return invalid(body.error);
      request = () => privateRequest(null, `${path}/schedule`, { method: 'POST', body: body.data });
      break;
    }
    case 'delete':
      request = () => privateRequest(null, path, { method: 'DELETE', query: { confirm: 'true' } });
      break;
    default:
      request = () => privateRequest(null, `${path}/${o.data}`, { method: 'POST' });
  }
  return adminMutation(request, screens(k.data, i.data));
}

const listInputSchema = adminListQuerySchema
  .pick({ q: true, state: true, includeDeleted: true })
  .extend({ cursor: z.string().min(1).max(512) });

/** Page suivante d'une liste (bouton « Voir plus ») : pagination par curseur sans fetch côté client. */
export async function loadRowsAction(
  kind: ContentKind,
  query: unknown,
): Promise<ActionResult<Page<AdminRow>>> {
  const k = kindSchema.safeParse(kind);
  const q = listInputSchema.safeParse(query);
  if (!k.success) return invalid(k.error);
  if (!q.success) return invalid(q.error);
  return adminQuery(() =>
    privateRequest(pageSchema(adminRowSchema), CONTENT[k.data].api, {
      query: { ...q.data, limit: 25 },
    }),
  );
}

const searchSchema = z.string().trim().min(1).max(80);

/** Sélecteur de personnes (crédits) : recherche au fil de la frappe. */
export async function searchPeopleAction(q: string): Promise<ActionResult<AdminRow[]>> {
  const parsed = searchSchema.safeParse(q);
  if (!parsed.success) return invalid(parsed.error);
  return adminQuery(
    async () =>
      (
        await privateRequest(pageSchema(adminRowSchema), '/admin/people', {
          query: { q: parsed.data, limit: 8 },
        })
      ).items,
  );
}

/** Sélecteur de film mis en avant (actualités). */
export async function searchFilmsAction(q: string): Promise<ActionResult<AdminRow[]>> {
  const parsed = searchSchema.safeParse(q);
  if (!parsed.success) return invalid(parsed.error);
  return adminQuery(
    async () =>
      (
        await privateRequest(pageSchema(adminRowSchema), '/admin/films', {
          query: { q: parsed.data, limit: 8 },
        })
      ).items,
  );
}
