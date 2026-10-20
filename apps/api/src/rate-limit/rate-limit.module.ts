import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DevicesController } from './devices.controller.js';
import { GeoService } from './geo.service.js';
import { FloodGuard, IdentityThrottlerGuard } from './guards.js';
import { RateLimitService } from './rate-limit.service.js';

/** Limites de débit par identité (ADR-0015) : service, gardes et vérification des appareils. */
@Global()
@Module({
  imports: [AuthModule],
  controllers: [DevicesController],
  providers: [GeoService, RateLimitService, FloodGuard, IdentityThrottlerGuard],
  exports: [RateLimitService, FloodGuard, IdentityThrottlerGuard],
})
export class RateLimitModule {}
