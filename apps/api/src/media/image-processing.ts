import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import sharp, { type Metadata, type SharpOptions } from 'sharp';
import { BLUR_DATA_URL_PREFIX, IMAGE_WIDTHS } from '@ecine/contracts';

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
  /** Couleur dominante (#rrggbb) et aperçu flou, affichés avant l'image (charte, Skeletons). */
  preview: ImagePreview;
}

export interface ImagePreview {
  dominantColor: string;
  blurDataUrl: string;
}

/** Largeur de l'aperçu flou : 16 px, soit quelques centaines d'octets en WebP. */
const BLUR_WIDTH = 16;
const BLUR_QUALITY = 40;

const hex = (value: number) => Math.round(value).toString(16).padStart(2, '0');

/**
 * Couleur dominante et aperçu flou d'une image (calculés une fois, à l'envoi). Lit l'original ou
 * une variante déjà produite (rattrapage des images envoyées avant la refonte).
 */
export async function computePreview(
  source: Buffer | string,
  options: SharpOptions = { failOn: 'error', limitInputPixels: MAX_INPUT_PIXELS },
): Promise<ImagePreview> {
  // Fichier lu en mémoire : sharp garderait sinon un descripteur ouvert (verrou sous Windows).
  const input = typeof source === 'string' ? await readFile(source) : source;
  const { dominant } = await sharp(input, options)
    .rotate()
    .resize({ width: 64, withoutEnlargement: true })
    .stats();
  const blur = await sharp(input, options)
    .rotate()
    .resize({ width: BLUR_WIDTH })
    .webp({ quality: BLUR_QUALITY })
    .toBuffer();
  return {
    dominantColor: `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`,
    blurDataUrl: `${BLUR_DATA_URL_PREFIX}${blur.toString('base64')}`,
  };
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
    return { width, height, bytes, format, preview: await computePreview(buffer, options) };
  } catch (err) {
    await rm(outDir, { recursive: true, force: true });
    // Erreur système (disque plein, droits) : remontée telle quelle ; sinon, décodage impossible.
    if ((err as NodeJS.ErrnoException).code) throw err;
    throw new UnsupportedImageError('Image corrompue ou illisible');
  }
}
