import { mkdirSync } from 'node:fs';
import type { IncomingMessage } from 'node:http';
import { resolve } from 'node:path';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Response } from 'express';
import { IMAGE_UPLOAD_MAX_BYTES, IMAGE_UPLOAD_MIME_TYPES } from '@ecine/contracts';
import type { Env } from '../config/env.js';

/** Taille maximale d'un morceau d'envoi vidéo (le client envoie 3 Mio : limite Vercel de 4,5 Mo). */
export const UPLOAD_CHUNK_MAX_BYTES = 4 * 1024 * 1024;

const IMAGE_UPLOAD_PATH = /^\/v1\/admin\/media\/images\/?$/;
const CHUNK_UPLOAD_PATH = /^\/v1\/admin\/media\/uploads\/[a-z0-9]{10,40}\/?$/;

function mediaType(req: IncomingMessage): string {
  return (req.headers['content-type'] ?? '').split(';')[0]!.trim().toLowerCase();
}

function pathOf(req: IncomingMessage): string {
  return (req.url ?? '').split('?')[0]!;
}

/**
 * Corps binaires limités à leurs routes : image (POST, 8 Mio) et morceau de vidéo (PATCH, 4 Mio).
 * Toutes les autres routes gardent la limite JSON de 100 Ko. À appeler avant l'enregistrement des routes.
 */
export function configureUploadParsers(app: NestExpressApplication): void {
  const imageTypes = new Set<string>(IMAGE_UPLOAD_MIME_TYPES);
  app.useBodyParser('raw', {
    limit: IMAGE_UPLOAD_MAX_BYTES,
    type: (req: IncomingMessage) =>
      req.method === 'POST' &&
      IMAGE_UPLOAD_PATH.test(pathOf(req)) &&
      imageTypes.has(mediaType(req)),
  });
  app.useBodyParser('raw', {
    limit: UPLOAD_CHUNK_MAX_BYTES,
    type: (req: IncomingMessage) =>
      req.method === 'PATCH' &&
      CHUNK_UPLOAD_PATH.test(pathOf(req)) &&
      mediaType(req) === 'application/octet-stream',
  });
}

/** Répertoires de stockage : seules les images compressées sont publiques. Sources et HLS restent privés. */
export function storagePaths(env: Pick<Env, 'STORAGE_DIR'>) {
  const root = resolve(env.STORAGE_DIR);
  return {
    root,
    images: resolve(root, 'images'),
    sources: resolve(root, 'sources'),
    uploads: resolve(root, 'uploads'),
    hls: resolve(root, 'hls'),
    /** Aperçus promotionnels publics (ADR-0015) : MP4 240p muets, en cache un an. */
    previews: resolve(root, 'previews'),
    /** Bases DB-IP Lite des limites de débit (privées, jamais servies). */
    geo: resolve(root, 'geo'),
  };
}

/**
 * Images publiques (déjà ré-encodées par sharp) servies sous /media/images, sans listage de répertoire.
 * En production, Caddy sert ce même répertoire directement (infra/Caddyfile).
 */
export function configureStatic(app: NestExpressApplication, env: Env): void {
  const paths = storagePaths(env);
  for (const dir of Object.values(paths)) mkdirSync(dir, { recursive: true });
  app.useStaticAssets(paths.images, {
    prefix: '/media/images/',
    index: false,
    dotfiles: 'deny',
    fallthrough: false,
    immutable: true,
    maxAge: '365d',
    setHeaders: (res: Response) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });
  // Aperçus promotionnels (ADR-0015) : MP4 240p muets et filigranés, seule vidéo servie sans jeton.
  // Nom versionné à chaque changement : cache d'un an, immuable.
  app.useStaticAssets(paths.previews, {
    prefix: '/media/previews/',
    index: false,
    dotfiles: 'deny',
    fallthrough: false,
    immutable: true,
    maxAge: '365d',
    setHeaders: (res: Response) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });
}
