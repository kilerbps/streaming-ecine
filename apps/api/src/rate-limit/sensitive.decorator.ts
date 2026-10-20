import { applyDecorators, SetMetadata } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { SensitiveOptions } from './rate-limit.service.js';

export const SENSITIVE = 'ecine:rate-limit:sensitive';

/**
 * Route sensible (ADR-0015) : authentification, mots de passe, double authentification, contact…
 * Limite par identité **et** plafond par IP, toujours appliqués, même en mode observation.
 */
export function SensitiveLimit(options: SensitiveOptions) {
  return applyDecorators(
    Throttle({ default: { limit: options.limit, ttl: options.ttlMs } }),
    SetMetadata(SENSITIVE, options),
  );
}
