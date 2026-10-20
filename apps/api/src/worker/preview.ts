import { createHash } from 'node:crypto';
import { PREVIEW_CLIP } from '@ecine/contracts';
import { toPosixPath } from './ffmpeg.js';

/**
 * Aperçus promotionnels (ADR-0015, exception validée le 20 octobre 2026) : extrait de 14 s au passage
 * choisi en administration, 240p, sans son, filigrané, MP4 lisible pendant le téléchargement
 * (`faststart`). Environ 0,6 Mo, bien sous le plafond de 1,5 Mo d'un aperçu.
 */

/** Changer cette version régénère tous les aperçus (nom de fichier versionné, cache d'un an). */
export const WATERMARK_VERSION = 1;

/** Filigrane (décision du propriétaire) : logo blanc en bas à droite, ~10 % de la largeur, 60 %. */
export const WATERMARK = { widthRatio: 0.1, opacity: 0.6, marginRatio: 0.04 } as const;

/** Débit vidéo de l'extrait (kbit/s) : 350 en moyenne, 400 au plus. */
export const PREVIEW_BITRATE_K = { average: 350, max: 400 } as const;

/** Début réel : jamais négatif, et l'extrait entier tient dans la vidéo. */
export function previewStart(requestedSec: number, durationSec: number | null): number {
  const start = Math.max(0, Math.floor(requestedSec));
  if (durationSec === null) return start;
  return Math.min(start, Math.max(0, Math.floor(durationSec - PREVIEW_CLIP.seconds)));
}

/** Nom versionné : change avec la vidéo, le début, la durée ou le filigrane. */
export function previewFileName(filmId: string, videoId: string, startSec: number): string {
  const hash = createHash('sha256')
    .update(`${videoId}:${startSec}:${PREVIEW_CLIP.seconds}:${WATERMARK_VERSION}`)
    .digest('hex')
    .slice(0, 12);
  return `${filmId}-${hash}.mp4`;
}

/** Taille de l'extrait (240p, proportions gardées, largeur paire) et place du filigrane. */
export function previewGeometry(sourceWidth: number, sourceHeight: number) {
  const height = PREVIEW_CLIP.height;
  const width = Math.max(2, Math.round((height * sourceWidth) / sourceHeight / 2) * 2);
  return {
    width,
    height,
    logoWidth: Math.max(2, Math.round((width * WATERMARK.widthRatio) / 2) * 2),
    marginX: Math.round(width * WATERMARK.marginRatio),
    marginY: Math.round(height * WATERMARK.marginRatio),
  };
}

export interface PreviewArgsInput {
  input: string;
  watermark: string;
  output: string;
  startSec: number;
  sourceWidth: number;
  sourceHeight: number;
}

export function buildPreviewArgs(o: PreviewArgsInput): string[] {
  const g = previewGeometry(o.sourceWidth, o.sourceHeight);
  const filter = [
    `[0:v:0]scale=w=${g.width}:h=${g.height},setsar=1,format=yuv420p[base]`,
    `[1:v]scale=w=${g.logoWidth}:h=-1,format=rgba,colorchannelmixer=aa=${WATERMARK.opacity}[mark]`,
    `[base][mark]overlay=x=W-w-${g.marginX}:y=H-h-${g.marginY},format=yuv420p[out]`,
  ].join(';');
  return [
    '-hide_banner',
    '-nostdin',
    '-y',
    '-loglevel',
    'error',
    // Recherche rapide avant l'entrée : seule la vidéo est décalée, pas le filigrane.
    '-ss',
    String(o.startSec),
    '-t',
    String(PREVIEW_CLIP.seconds),
    '-i',
    toPosixPath(o.input),
    '-i',
    toPosixPath(o.watermark),
    '-filter_complex',
    filter,
    '-map',
    '[out]',
    '-an',
    '-c:v',
    'libx264',
    '-profile:v',
    'main',
    '-preset',
    'veryfast',
    '-b:v',
    `${PREVIEW_BITRATE_K.average}k`,
    '-maxrate',
    `${PREVIEW_BITRATE_K.max}k`,
    '-bufsize',
    `${PREVIEW_BITRATE_K.max * 2}k`,
    '-fpsmax',
    '30',
    '-movflags',
    '+faststart',
    toPosixPath(o.output),
  ];
}
