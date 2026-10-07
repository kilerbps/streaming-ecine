import { Module } from '@nestjs/common';
import { PlaybackController, SegmentsController } from './playback.controller.js';
import { PlaybackTokenService } from './playback-token.service.js';
import { PlaybackService } from './playback.service.js';

@Module({
  controllers: [PlaybackController, SegmentsController],
  providers: [PlaybackService, PlaybackTokenService],
})
export class PlaybackModule {}
