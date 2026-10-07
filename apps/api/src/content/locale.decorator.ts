import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@ecine/contracts';

/** Langue de la réponse : `?locale=`, sinon `Accept-Language`, sinon français. */
export const RequestLocale = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Locale => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const fromQuery = typeof req.query.locale === 'string' ? req.query.locale : undefined;
    const candidates = [fromQuery, ...(req.acceptsLanguages() ?? [])];
    for (const candidate of candidates) {
      const base = candidate?.slice(0, 2).toLowerCase();
      if (base && (LOCALES as readonly string[]).includes(base)) return base as Locale;
    }
    return DEFAULT_LOCALE;
  },
);
