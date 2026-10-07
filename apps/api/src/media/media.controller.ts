import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  confirmQuerySchema,
  idSchema,
  imageAltInputSchema,
  imageUploadQuerySchema,
  imageUploadResultSchema,
  UPLOAD_OFFSET_HEADER,
  videoStatusSchema,
  videoUploadInitSchema,
  videoUploadSchema,
  type ImageUploadResult,
  type VideoStatus,
  type VideoUpload,
} from '@ecine/contracts';
import type { z } from 'zod';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { BodySchema, QuerySchema, Returns } from '../common/contract.decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { ImagesService } from './images.service.js';
import { UploadsService } from './uploads.service.js';
import { VideosService } from './videos.service.js';

function noStore(res: Response): void {
  res.setHeader('Cache-Control', 'no-store');
}

/**
 * Envois d'images et de vidéos (EDITOR). Les corps binaires sont acceptés uniquement sur ces routes
 * (configureUploadParsers) ; le format réel est toujours vérifié côté serveur.
 */
@ApiTags('admin-media')
@Roles('EDITOR')
@Controller('admin/media')
export class MediaController {
  constructor(
    private readonly images: ImagesService,
    private readonly uploads: UploadsService,
  ) {}

  /** Corps : octets bruts de l'image (image/jpeg|png|webp|avif, 8 Mio max). */
  @Post('images')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @QuerySchema(imageUploadQuerySchema)
  @Returns(imageUploadResultSchema)
  uploadImage(
    @Query(new ZodPipe(imageUploadQuerySchema)) query: z.infer<typeof imageUploadQuerySchema>,
    @Body() body: unknown,
    @Req() req: Request,
  ): Promise<ImageUploadResult> {
    return this.images.upload(body, query, req);
  }

  @Patch('images/:id')
  @BodySchema(imageAltInputSchema)
  @Returns(imageUploadResultSchema)
  updateImage(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Body(new ZodPipe(imageAltInputSchema)) input: z.infer<typeof imageAltInputSchema>,
    @Req() req: Request,
  ): Promise<ImageUploadResult> {
    return this.images.updateAlt(id, input, req);
  }

  @Post('uploads')
  @BodySchema(videoUploadInitSchema)
  @Returns(videoUploadSchema)
  initUpload(
    @Body(new ZodPipe(videoUploadInitSchema)) input: z.infer<typeof videoUploadInitSchema>,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ): Promise<VideoUpload> {
    return this.uploads.init(input, user, req);
  }

  @Get('uploads/:id')
  @Returns(videoUploadSchema)
  getUpload(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<VideoUpload> {
    noStore(res);
    return this.uploads.get(id, user);
  }

  /** Corps : morceau brut (application/octet-stream, 4 Mio max) ; en-tête `upload-offset` = receivedBytes. */
  @Patch('uploads/:id')
  @Throttle({ default: { limit: 300, ttl: 60_000 } })
  @Returns(videoUploadSchema)
  uploadChunk(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Headers(UPLOAD_OFFSET_HEADER) offset: string | undefined,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<VideoUpload> {
    noStore(res);
    return this.uploads.chunk(id, offset, body, user);
  }

  @Post('uploads/:id/complete')
  @HttpCode(200)
  @Returns(videoStatusSchema)
  completeUpload(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ): Promise<VideoStatus> {
    return this.uploads.complete(id, user, req);
  }
}

/** Suivi du transcodage, relance et suppression (EDITOR). */
@ApiTags('admin-media')
@Roles('EDITOR')
@Controller('admin/videos')
export class VideosController {
  constructor(private readonly videos: VideosService) {}

  @Get(':id/status')
  @Returns(videoStatusSchema)
  status(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<VideoStatus> {
    noStore(res);
    return this.videos.status(id);
  }

  @Post(':id/retry')
  @HttpCode(200)
  @Returns(videoStatusSchema)
  retry(@Param('id', new ZodPipe(idSchema)) id: string, @Req() req: Request): Promise<VideoStatus> {
    return this.videos.retry(id, req);
  }

  @Delete(':id')
  @HttpCode(204)
  @QuerySchema(confirmQuerySchema)
  async remove(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Query(new ZodPipe(confirmQuerySchema)) _confirm: z.infer<typeof confirmQuerySchema>,
    @Req() req: Request,
  ): Promise<void> {
    await this.videos.remove(id, req);
  }
}
