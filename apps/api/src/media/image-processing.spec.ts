import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { IMAGE_WIDTHS } from '@ecine/contracts';
import { allowedFormat, processImage, UnsupportedImageError } from './image-processing.js';

const solid = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: { r: 228, g: 87, b: 46 } } });

describe('processImage', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ecine-img-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('produit une variante WebP par largeur, sans agrandir', async () => {
    const out = join(dir, 'cimg1');
    const result = await processImage(await solid(800, 600).png().toBuffer(), out);
    expect(result).toMatchObject({ width: 800, height: 600, format: 'png' });
    expect(result.bytes).toBeGreaterThan(0);
    for (const w of IMAGE_WIDTHS) expect(existsSync(join(out, `w${w}.webp`))).toBe(true);
    const small = await sharp(await readFile(join(out, 'w320.webp'))).metadata();
    const large = await sharp(await readFile(join(out, 'w1920.webp'))).metadata();
    expect(small.format).toBe('webp');
    expect(small.width).toBe(320);
    expect(large.width).toBe(800);
  });

  it('applique l’orientation EXIF et supprime les métadonnées', async () => {
    const input = await solid(400, 200).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const out = join(dir, 'cimg2');
    const result = await processImage(input, out);
    expect(result).toMatchObject({ width: 200, height: 400, format: 'jpeg' });
    const meta = await sharp(await readFile(join(out, 'w320.webp'))).metadata();
    expect(meta.width).toBe(200);
    expect(meta.height).toBe(400);
    expect(meta.exif).toBeUndefined();
    expect(meta.orientation).toBeUndefined();
  });

  it('refuse SVG, GIF et fichiers qui ne sont pas des images, sans rien écrire', async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
    );
    const gif = await solid(10, 10).gif().toBuffer();
    for (const input of [svg, gif, Buffer.from('pas une image')]) {
      const out = join(dir, 'refus');
      await expect(processImage(input, out)).rejects.toBeInstanceOf(UnsupportedImageError);
      expect(existsSync(out)).toBe(false);
    }
  });
});

describe('allowedFormat', () => {
  it('accepte JPEG, PNG, WebP et AVIF (HEIF/AV1), refuse le reste', () => {
    expect(allowedFormat({ format: 'jpeg' })).toBe('jpeg');
    expect(allowedFormat({ format: 'webp' })).toBe('webp');
    expect(allowedFormat({ format: 'heif', compression: 'av1' })).toBe('avif');
    expect(allowedFormat({ format: 'heif', compression: 'hevc' })).toBeNull();
    expect(allowedFormat({ format: 'svg' })).toBeNull();
    expect(allowedFormat({ format: 'gif' })).toBeNull();
    expect(allowedFormat({ format: 'tiff' })).toBeNull();
  });
});
