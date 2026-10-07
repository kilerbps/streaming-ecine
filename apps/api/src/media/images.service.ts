import { rm } from 'node:fs/promises';
import { Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { ImageUploadQuery, ImageUploadResult } from '@ecine/contracts';
import { ENV, type Env } from '../config/env.js';
import { AuditService } from '../audit/audit.service.js';
import { ProblemException } from '../common/problem.js';
import { MediaUrls } from '../content/content.helpers.js';
import type { Media } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ContentEventsService } from '../revalidate/content-events.service.js';
import { processImage, UnsupportedImageError } from './image-processing.js';
import { unsupportedMedia } from './media.problems.js';
import { newId, storageFile } from './storage.js';

const ALT_REQUIRED = ProblemException.badRequest('Texte alternatif requis.', [
  { path: 'alt', message: 'Décrivez l’image (ou cochez « image décorative »).' },
]);

/** Images publiques : ré-encodées par sharp, servies sous /media/images/{id}/w{largeur}.webp. */
@Injectable()
export class ImagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: ContentEventsService,
    private readonly urls: MediaUrls,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async upload(body: unknown, query: ImageUploadQuery, req: Request): Promise<ImageUploadResult> {
    const decorative = query.decorative === 'true';
    const alt = query.alt?.trim() ?? '';
    if (!decorative && !alt) throw ALT_REQUIRED;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      throw unsupportedMedia(
        'Envoyez le fichier image brut (JPEG, PNG, WebP ou AVIF) dans le corps de la requête.',
      );
    }

    const id = newId();
    const storageKey = `images/${id}`;
    const outDir = storageFile(this.env, storageKey);
    let processed;
    try {
      processed = await processImage(body, outDir);
    } catch (err) {
      if (err instanceof UnsupportedImageError) {
        throw unsupportedMedia(
          'Format refusé : seuls JPEG, PNG, WebP et AVIF sont acceptés (SVG et GIF exclus).',
        );
      }
      throw err;
    }

    let media: Media;
    try {
      media = await this.prisma.media.create({
        data: {
          id,
          kind: 'IMAGE',
          storageKey,
          mime: 'image/webp',
          bytes: processed.bytes,
          width: processed.width,
          height: processed.height,
          alt: decorative ? null : alt,
          decorative,
        },
      });
    } catch (err) {
      await rm(outDir, { recursive: true, force: true });
      throw err;
    }
    await this.audit.log(req, {
      action: 'media.image_upload',
      entity: 'Media',
      entityId: media.id,
      meta: { format: processed.format, width: processed.width, height: processed.height },
    });
    return this.result(media);
  }

  async updateAlt(
    id: string,
    input: { alt: string; decorative: boolean },
    req: Request,
  ): Promise<ImageUploadResult> {
    const alt = input.alt.trim();
    if (!input.decorative && !alt) throw ALT_REQUIRED;
    const existing = await this.prisma.media.findFirst({
      where: { id, kind: 'IMAGE' },
      select: { id: true },
    });
    if (!existing) throw ProblemException.notFound('Image introuvable.');

    const media = await this.prisma.media.update({
      where: { id },
      data: { alt: input.decorative ? null : alt, decorative: input.decorative },
      include: {
        filmPosters: { select: { slug: true } },
        personPhotos: { select: { slug: true } },
        articleCovers: { select: { slug: true } },
        postImages: { select: { postId: true }, take: 1 },
        teamPhotos: { select: { id: true }, take: 1 },
      },
    });
    await this.audit.log(req, {
      action: 'media.image_alt',
      entity: 'Media',
      entityId: id,
      meta: { decorative: input.decorative },
    });

    // Le texte alternatif apparaît dans les pages déjà en cache : on les invalide.
    if (media.filmPosters.length)
      await this.events.changed(
        'film',
        media.filmPosters.map((f) => f.slug),
      );
    if (media.personPhotos.length)
      await this.events.changed(
        'person',
        media.personPhotos.map((p) => p.slug),
      );
    if (media.articleCovers.length)
      await this.events.changed(
        'article',
        media.articleCovers.map((a) => a.slug),
      );
    if (media.postImages.length) await this.events.changed('post');
    if (media.teamPhotos.length) await this.events.changed('team');
    return this.result(media);
  }

  private result(media: Media): ImageUploadResult {
    const image = this.urls.imageWithId(media);
    if (!image) throw new Error('Image enregistrée sans dimensions');
    return image;
  }
}
