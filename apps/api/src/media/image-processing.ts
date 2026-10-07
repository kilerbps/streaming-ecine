import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import sharp, { type Metadata } from 'sharp';
import { IMAGE_WIDTHS } from '@ecine/contracts';

/** Au-delà, l'image est refusée avant décodage (protection contre les « bombes » de décompression). */
const MAX_INPUT_PIXELS = 50_000_000;
const WEBP_QUALITY = 75;

/** Format refusé : seuls JPEG, PNG, WebP et AVIF sont acceptés (jamais SVG, GIF, TIFF…). */
export class UnsupportedImageError extends Error {
  constructor(message = 'Format d’image non pris en charge') {
    super(message);
    this.name = 'UnsupportedImageError';
  }
}

export interface ProcessedImage {
  /** Dimensions de l'original après orientation EXIF. */
  width: number;
  height: number;
  /** Poids du plus grand fichier produit. */
  bytes: number;
  /** Format réel détecté (jamais le Content-Type déclaré). */
  format: 'jpeg' | 'png' | 'webp' | 'avif';
}

/** Format réel lu dans les octets ; `null` si le format n'est pas autorisé. */
export function allowedFormat(
  meta: Pick<Metadata, 'format' | 'compression'>,
): ProcessedImage['format'] | null {
  switch (meta.format) {
    case 'jpeg':
    case 'png':
    case 'webp':
      return meta.format;
    case 'heif':
      // AVIF = conteneur HEIF compressé en AV1 (le HEIC/HEVC n'est pas accepté).
      return meta.compression === 'av1' ? 'avif' : null;
    default:
      return null;
  }
}

/**
 * Ré-encode une image téléversée : format vérifié par le contenu, orientation EXIF appliquée,
 * métadonnées supprimées (EXIF, GPS, XMP), puis une variante WebP par largeur de IMAGE_WIDTHS :
 * `{outDir}/w{largeur}.webp` (jamais agrandie). En cas d'échec, `outDir` est supprimé.
 */
export async function processImage(buffer: Buffer, outDir: string): Promise<ProcessedImage> {
  const options = { failOn: 'error', limitInputPixels: MAX_INPUT_PIXELS } as const;
  let meta: Metadata;
  try {
    meta = await sharp(buffer, options).metadata();
  } catch {
    throw new UnsupportedImageError('Fichier illisible ou qui n’est pas une image');
  }
  const format = allowedFormat(meta);
  if (!format) throw new UnsupportedImageError();
  const width = meta.autoOrient.width;
  const height = meta.autoOrient.height;
  if (!width || !height) throw new UnsupportedImageError('Dimensions de l’image illisibles');

  await mkdir(outDir, { recursive: true });
  try {
    let bytes = 0;
    // Séquentiel : une seule image décodée à la fois (mémoire bornée sur un petit VPS).
    for (const target of IMAGE_WIDTHS) {
      const info = await sharp(buffer, options)
        .rotate()
        .resize({ width: target, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toFile(join(outDir, `w${target}.webp`));
      bytes = Math.max(bytes, info.size);
    }
    return { width, height, bytes, format };
  } catch (err) {
    await rm(outDir, { recursive: true, force: true });
    // Erreur système (disque plein, droits) : remontée telle quelle ; sinon, décodage impossible.
    if ((err as NodeJS.ErrnoException).code) throw err;
    throw new UnsupportedImageError('Image corrompue ou illisible');
  }
}
