import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module.js';
import { ImagesService } from './images.service.js';
import { MediaController, VideosController } from './media.controller.js';
import { UploadsService } from './uploads.service.js';
import { VideosService } from './videos.service.js';

/** Médias d'administration : images publiques ré-encodées, envois vidéo reprenables, suivi du transcodage. */
@Module({
  imports: [QueueModule],
  controllers: [MediaController, VideosController],
  providers: [ImagesService, UploadsService, VideosService],
  exports: [VideosService],
})
export class MediaModule {}
