import { createHash } from 'node:crypto';
import { access, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import { IMAGE_WIDTHS, imageCropsSchema } from '@ecine/contracts';
import sharp from 'sharp';
import { ENV, type Env } from '../config/env.js';
import { ProblemException } from '../common/problem.js';
import { visibleWhere } from '../content/content.helpers.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { storageFile } from './storage.js';

/** Affiche des images de partage : 2:3, 420 × 630 (moitié gauche d'une carte 1200 × 630). */
export const SHARE_POSTER = { width: 420, height: 630 } as const;

const exists = (path: string) =>
  access(path).then(
    () => true,
    () => false,
  );

/** Rectangle 2:3 en pixels : recadrage enregistré, sinon centré sur le point focal (ou le milieu). */
export function posterRect(
  size: { width: number; height: number },
  framing: {
    focal: { x: number; y: number } | null;
    crop: { x: number; y: number; w: number; h: number } | null;
  },
): { left: number; top: number; width: number; height: number } {
  if (framing.crop) {
    return {
      left: Math.round(framing.crop.x * size.width),
      top: Math.round(framing.crop.y * size.height),
      width: Math.max(1, Math.round(framing.crop.w * size.width)),
      height: Math.max(1, Math.round(framing.crop.h * size.height)),
    };
  }
  let width = size.width;
  let height = Math.round((width * 3) / 2);
  if (height > size.height) {
    height = size.height;
    width = Math.round((height * 2) / 3);
  }
  const center = framing.focal ?? { x: 0.5, y: 0.5 };
  const left = Math.min(
    size.width - width,
    Math.max(0, Math.round(center.x * size.width - width / 2)),
  );
  const top = Math.min(
    size.height - height,
    Math.max(0, Math.round(center.y * size.height - height / 2)),
  );
  return { left, top, width, height };
}

/**
 * Image de partage d'une fiche film : JPEG de l'affiche (le moteur des images Open Graph ne lit pas le
 * WebP). Les variantes WebP sont déjà publiques : ce JPEG n'expose rien de plus. Calculé une fois par
 * cadrage puis gardé à côté des variantes ; un nouveau cadrage produit un nouveau fichier.
 */
@Injectable()
export class ShareImageService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async filmPoster(slug: string): Promise<string> {
    const film = await this.prisma.film.findFirst({
      where: { slug, ...visibleWhere() },
      select: {
        poster: {
          select: { storageKey: true, kind: true, focalX: true, focalY: true, crops: true },
        },
      },
    });
    const media = film?.poster;
    if (!media || media.kind !== 'IMAGE' || !media.storageKey) {
      throw ProblemException.notFound('Affiche introuvable.');
    }
    const crops = imageCropsSchema.safeParse(media.crops);
    const framing = {
      focal:
        media.focalX != null && media.focalY != null ? { x: media.focalX, y: media.focalY } : null,
      crop: crops.success ? (crops.data['2:3'] ?? null) : null,
    };
    const dir = storageFile(this.env, media.storageKey);
    const hash = createHash('sha256').update(JSON.stringify(framing)).digest('hex').slice(0, 12);
    const out = join(dir, `share-2x3-${hash}.jpg`);
    if (await exists(out)) return out;

    let source: string | null = null;
    for (const width of [...IMAGE_WIDTHS].reverse()) {
      const candidate = join(dir, `w${width}.webp`);
      if (await exists(candidate)) {
        source = candidate;
        break;
      }
    }
    if (!source) throw ProblemException.notFound('Affiche introuvable.');
    const meta = await sharp(source).metadata();
    if (!meta.width || !meta.height) throw ProblemException.notFound('Affiche illisible.');
    const tmp = `${out}.${process.pid}.tmp`;
    await sharp(source)
      .extract(posterRect({ width: meta.width, height: meta.height }, framing))
      .resize(SHARE_POSTER.width, SHARE_POSTER.height, { fit: 'cover' })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(tmp);
    await rename(tmp, out);
    return out;
  }
}
