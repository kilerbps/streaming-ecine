'use server';

import {
  confirmQuerySchema,
  idSchema,
  IMAGE_UPLOAD_MIME_TYPES,
  imageAltInputSchema,
  imageUploadQuerySchema,
  imageUploadResultSchema,
  UPLOAD_OFFSET_HEADER,
  videoStatusSchema,
  videoUploadInitSchema,
  videoUploadSchema,
  type ImageUploadResult,
  type VideoStatus,
  type VideoUpload,
} from '@ecine/contracts';
import { z } from 'zod';
import { ADMIN_IMAGE_MAX_BYTES } from '@/components/admin/config';
import { privateRequest } from '../../api-client';
import { invalid, type ActionResult } from '../result';
import { adminMutation, adminQuery, enc } from './core';

/**
 * Médias de l'administration. Les octets transitent par des Server Actions (FormData) : le navigateur
 * ne parle jamais directement à l'API et aucun jeton n'est exposé. Morceaux vidéo de 3 Mio et images
 * de 4 Mo au plus (limite des Server Actions : next.config.ts).
 */

const CHUNK_MAX_BYTES = 3 * 1024 * 1024;

function tooLarge(message: string): ActionResult<never> {
  return { ok: false, code: 'validation', error: message };
}

/** Image : FormData { file, alt, decorative } → POST /admin/media/images?alt=…&decorative=… (octets bruts). */
export async function uploadImageAction(form: FormData): Promise<ActionResult<ImageUploadResult>> {
  const file = form.get('file');
  if (!(file instanceof Blob) || file.size === 0) return tooLarge('Choisissez une image.');
  if (!(IMAGE_UPLOAD_MIME_TYPES as readonly string[]).includes(file.type)) {
    return tooLarge('Format refusé : JPEG, PNG, WebP ou AVIF uniquement.');
  }
  if (file.size > ADMIN_IMAGE_MAX_BYTES) return tooLarge('Image trop lourde : 4 Mo au plus.');
  const query = imageUploadQuerySchema.safeParse({
    alt: typeof form.get('alt') === 'string' ? form.get('alt') : undefined,
    decorative: form.get('decorative') === 'true' ? 'true' : 'false',
  });
  if (!query.success) return invalid(query.error);
  if (query.data.decorative === 'false' && !query.data.alt) {
    return {
      ok: false,
      code: 'validation',
      error: 'Décrivez l’image (ou cochez « image décorative »).',
      fieldErrors: { alt: 'Texte alternatif requis.' },
    };
  }
  const data = new Uint8Array(await file.arrayBuffer());
  return adminQuery(() =>
    privateRequest(imageUploadResultSchema, '/admin/media/images', {
      method: 'POST',
      query: { alt: query.data.alt, decorative: query.data.decorative },
      rawBody: { data, contentType: file.type },
    }),
  );
}

/** Texte alternatif d'une image déjà envoyée (les pages publiques concernées sont revalidées par l'API). */
export async function updateImageAltAction(
  id: string,
  input: unknown,
): Promise<ActionResult<ImageUploadResult>> {
  const i = idSchema.safeParse(id);
  const body = imageAltInputSchema.safeParse(input);
  if (!i.success) return invalid(i.error);
  if (!body.success) return invalid(body.error);
  return adminMutation(() =>
    privateRequest(imageUploadResultSchema, `/admin/media/images/${enc(i.data)}`, {
      method: 'PATCH',
      body: body.data,
    }),
  );
}

// ——— Vidéo : envoi reprenable par morceaux ———

export async function initVideoUploadAction(input: unknown): Promise<ActionResult<VideoUpload>> {
  const parsed = videoUploadInitSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return adminQuery(() =>
    privateRequest(videoUploadSchema, '/admin/media/uploads', {
      method: 'POST',
      body: parsed.data,
    }),
  );
}

/** État d'un envoi (position à laquelle reprendre). */
export async function getVideoUploadAction(uploadId: string): Promise<ActionResult<VideoUpload>> {
  const i = idSchema.safeParse(uploadId);
  if (!i.success) return invalid(i.error);
  return adminQuery(() => privateRequest(videoUploadSchema, `/admin/media/uploads/${enc(i.data)}`));
}

/** Morceau : FormData { chunk, offset } → PATCH avec l'en-tête upload-offset. 409 = reprendre ailleurs. */
export async function uploadVideoChunkAction(
  uploadId: string,
  form: FormData,
): Promise<ActionResult<VideoUpload>> {
  const i = idSchema.safeParse(uploadId);
  const offset = z.coerce.number().int().min(0).safeParse(form.get('offset'));
  const chunk = form.get('chunk');
  if (!i.success) return invalid(i.error);
  if (!offset.success) return invalid(offset.error);
  if (!(chunk instanceof Blob) || chunk.size === 0) return tooLarge('Morceau vide.');
  if (chunk.size > CHUNK_MAX_BYTES) return tooLarge('Morceau trop gros.');
  const data = new Uint8Array(await chunk.arrayBuffer());
  return adminQuery(() =>
    privateRequest(videoUploadSchema, `/admin/media/uploads/${enc(i.data)}`, {
      method: 'PATCH',
      rawBody: {
        data,
        contentType: 'application/octet-stream',
        headers: { [UPLOAD_OFFSET_HEADER]: String(offset.data) },
      },
    }),
  );
}

export async function completeVideoUploadAction(
  uploadId: string,
  filmId: string,
): Promise<ActionResult<VideoStatus>> {
  const i = idSchema.safeParse(uploadId);
  const f = idSchema.safeParse(filmId);
  if (!i.success) return invalid(i.error);
  if (!f.success) return invalid(f.error);
  return adminMutation(
    () =>
      privateRequest(videoStatusSchema, `/admin/media/uploads/${enc(i.data)}/complete`, {
        method: 'POST',
      }),
    [`/admin/films/${f.data}`],
  );
}

/** Suivi du transcodage (interrogé toutes les 3 s par l'écran du film). */
export async function videoStatusAction(videoId: string): Promise<ActionResult<VideoStatus>> {
  const i = idSchema.safeParse(videoId);
  if (!i.success) return invalid(i.error);
  return adminQuery(() => privateRequest(videoStatusSchema, `/admin/videos/${enc(i.data)}/status`));
}

export async function retryVideoAction(
  videoId: string,
  filmId: string,
): Promise<ActionResult<VideoStatus>> {
  const i = idSchema.safeParse(videoId);
  const f = idSchema.safeParse(filmId);
  if (!i.success) return invalid(i.error);
  if (!f.success) return invalid(f.error);
  return adminMutation(
    () =>
      privateRequest(videoStatusSchema, `/admin/videos/${enc(i.data)}/retry`, { method: 'POST' }),
    [`/admin/films/${f.data}`],
  );
}

/** Suppression d'une vidéo (sources, HLS et clés révoqués côté API). */
export async function deleteVideoAction(videoId: string, filmId: string): Promise<ActionResult> {
  const i = idSchema.safeParse(videoId);
  const f = idSchema.safeParse(filmId);
  if (!i.success) return invalid(i.error);
  if (!f.success) return invalid(f.error);
  const confirm = confirmQuerySchema.parse({ confirm: 'true' });
  return adminMutation(
    () =>
      privateRequest(null, `/admin/videos/${enc(i.data)}`, { method: 'DELETE', query: confirm }),
    [`/admin/films/${f.data}`, '/admin/films'],
  );
}
