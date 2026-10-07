import { randomInt } from 'node:crypto';
import { resolve, sep } from 'node:path';
import type { Env } from '../config/env.js';
import { storagePaths } from './static.js';

const ALNUM = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Chaîne aléatoire `[a-z0-9]` (source cryptographique) : identifiants et préfixes de segments non devinables. */
export function randomAlnum(length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) out += ALNUM[randomInt(ALNUM.length)];
  return out;
}

/**
 * Identifiant généré avant l'écriture des fichiers (la clé de stockage en dépend).
 * Même forme que les cuid de Prisma : 25 caractères `[a-z0-9]` commençant par `c`.
 */
export function newId(): string {
  return `c${randomAlnum(24)}`;
}

/** Extension du fichier source selon le type déclaré (vérifié par signature au premier morceau). */
export const VIDEO_EXTENSIONS: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/x-matroska': '.mkv',
  'video/webm': '.webm',
};

const STORAGE_KEY_RE = /^(images|sources|uploads|hls)\/[a-z0-9][a-z0-9._-]*$/;

/**
 * Chemin absolu d'une clé de stockage (`images/{id}`, `sources/{id}.mp4`, `uploads/{id}.part`, `hls/{id}`).
 * Forme stricte : jamais la racine d'un dossier, jamais de traversée de répertoire.
 */
export function storageFile(env: Pick<Env, 'STORAGE_DIR'>, storageKey: string): string {
  if (!STORAGE_KEY_RE.test(storageKey) || storageKey.includes('..'))
    throw new Error('Clé de stockage invalide');
  const { root } = storagePaths(env);
  const full = resolve(root, storageKey);
  if (!full.startsWith(root + sep)) throw new Error('Clé de stockage hors de la racine');
  return full;
}

/** Répertoire HLS privé d'une vidéo (`storage/hls/{hlsBasePath}`). */
export function hlsDir(env: Pick<Env, 'STORAGE_DIR'>, hlsBasePath: string): string {
  return storageFile(env, `hls/${hlsBasePath}`);
}
