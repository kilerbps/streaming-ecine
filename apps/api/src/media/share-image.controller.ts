import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { slugSchema } from '@ecine/contracts';
import type { Response } from 'express';
import { Public } from '../auth/decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { ShareImageService } from './share-image.service.js';

/** Affiche JPEG des images de partage (Open Graph) d'une fiche film. */
@ApiTags('public')
@Public()
@Controller('share-images')
export class ShareImageController {
  constructor(private readonly shareImages: ShareImageService) {}

  @Get('films/:slug')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async filmPoster(
    @Param('slug', new ZodPipe(slugSchema)) slug: string,
    @Res() res: Response,
  ): Promise<void> {
    const path = await this.shareImages.filmPoster(slug);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.type('image/jpeg').sendFile(path);
  }
}
