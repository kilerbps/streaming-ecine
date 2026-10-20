import { describe, expect, it } from 'vitest';
import { PREVIEW_CLIP } from '@ecine/contracts';
import {
  buildPreviewArgs,
  previewFileName,
  previewGeometry,
  previewStart,
  PREVIEW_BITRATE_K,
} from './preview.js';

describe('aperçus promotionnels', () => {
  it('garde l’extrait entier dans la vidéo', () => {
    expect(previewStart(600, 3600)).toBe(600);
    expect(previewStart(3595, 3600)).toBe(3600 - PREVIEW_CLIP.seconds);
    expect(previewStart(-5, 3600)).toBe(0);
    expect(previewStart(10, 8)).toBe(0);
  });

  it('change de nom quand la vidéo ou le début changent (cache d’un an sans risque)', () => {
    const a = previewFileName('f1', 'v1', 600);
    expect(a).toMatch(/^f1-[0-9a-f]{12}\.mp4$/);
    expect(previewFileName('f1', 'v1', 600)).toBe(a);
    expect(previewFileName('f1', 'v2', 600)).not.toBe(a);
    expect(previewFileName('f1', 'v1', 601)).not.toBe(a);
  });

  it('240p proportions gardées, logo à ~10 % de la largeur, marge de 4 %', () => {
    expect(previewGeometry(1920, 1080)).toEqual({
      width: 426,
      height: 240,
      logoWidth: 42,
      marginX: 17,
      marginY: 10,
    });
    // Source verticale : largeur paire.
    expect(previewGeometry(1080, 1920).width % 2).toBe(0);
  });

  it('extrait muet, H.264 Main plafonné, lisible pendant le téléchargement', () => {
    const args = buildPreviewArgs({
      input: '/data/storage/sources/film.mp4',
      watermark: '/app/assets/watermark.png',
      output: '/data/previews/f1-abc.mp4',
      startSec: 600,
      sourceWidth: 1920,
      sourceHeight: 1080,
    });
    const joined = args.join(' ');
    expect(args.slice(args.indexOf('-ss'), args.indexOf('-ss') + 4)).toEqual([
      '-ss',
      '600',
      '-t',
      String(PREVIEW_CLIP.seconds),
    ]);
    // La recherche ne porte que sur la vidéo : elle précède sa seule entrée.
    expect(args.indexOf('-ss')).toBeLessThan(args.indexOf('-i'));
    expect(joined).toContain('-i /data/storage/sources/film.mp4 -i /app/assets/watermark.png');
    expect(args).toContain('-an');
    expect(joined).toContain('-profile:v main');
    expect(joined).toContain(`-maxrate ${PREVIEW_BITRATE_K.max}k`);
    expect(joined).toContain('-movflags +faststart');
    expect(joined).toContain('colorchannelmixer=aa=0.6');
    expect(joined).toContain('overlay=x=W-w-17:y=H-h-10');
  });

  it('reste sous le plafond de 1,5 Mo d’un aperçu', () => {
    const bytes = (PREVIEW_BITRATE_K.max * 1000 * PREVIEW_CLIP.seconds) / 8;
    expect(bytes).toBeLessThan(1_500_000);
  });
});
