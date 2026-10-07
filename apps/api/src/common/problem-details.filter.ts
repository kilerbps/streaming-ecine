import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { Problem } from '@ecine/contracts';
import { Prisma } from '../generated/prisma/client.js';
import { PROBLEM_TYPES, ProblemException } from './problem.js';

const TITLES: Record<number, string> = {
  400: 'Requête invalide',
  401: 'Non authentifié',
  403: 'Accès refusé',
  404: 'Introuvable',
  405: 'Méthode non autorisée',
  409: 'Conflit',
  413: 'Contenu trop volumineux',
  415: 'Type de contenu non pris en charge',
  422: 'Requête non traitable',
  429: 'Trop de requêtes',
  500: 'Erreur interne',
  503: 'Service indisponible',
};

function isClientHttpError(value: unknown): value is { status: number; expose: boolean } {
  if (typeof value !== 'object' || value === null) return false;
  const { status, expose } = value as { status?: unknown; expose?: unknown };
  return typeof status === 'number' && status >= 400 && status < 500 && expose === true;
}

/**
 * Toutes les erreurs sortent au format RFC 9457 (application/problem+json),
 * sans trace de pile ni détail interne (OWASP A10 : échec fermé, aucune fuite).
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Erreur');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const problem = this.toProblem(exception);
    problem.instance = req.originalUrl.split('?')[0];

    if (problem.status >= 500) {
      this.logger.error(
        {
          err:
            exception instanceof Error
              ? { name: exception.name, message: exception.message, stack: exception.stack }
              : exception,
        },
        'Erreur non gérée',
      );
    }
    if (res.headersSent) return;
    if (problem.status === 429 && !res.getHeader('Retry-After')) res.setHeader('Retry-After', '60');
    res.status(problem.status).type('application/problem+json').json(problem);
  }

  private toProblem(exception: unknown): Problem {
    if (exception instanceof ProblemException) return { ...exception.problem };

    if (exception instanceof ThrottlerException) {
      return {
        type: PROBLEM_TYPES.rateLimit,
        title: TITLES[429]!,
        status: 429,
        detail: 'Trop de requêtes. Réessayez dans un instant.',
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === 'object' && body && 'message' in body && typeof body.message === 'string'
          ? body.message
          : undefined;
      return {
        type: 'about:blank',
        title: TITLES[status] ?? 'Erreur',
        status,
        // Les messages des exceptions 4xx de Nest sont génériques ; jamais exposés pour les 5xx.
        detail: status < 500 ? message : undefined,
      };
    }

    // Erreurs du parseur de corps (http-errors) : JSON mal formé (400), corps trop volumineux (413)…
    if (isClientHttpError(exception)) {
      const status = exception.status;
      return {
        type: 'about:blank',
        title: TITLES[status] ?? 'Requête invalide',
        status,
        detail:
          status === 413
            ? 'Le contenu envoyé est trop volumineux.'
            : 'Le contenu envoyé est illisible.',
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return {
          type: PROBLEM_TYPES.conflict,
          title: TITLES[409]!,
          status: HttpStatus.CONFLICT,
          detail: 'Cette valeur est déjà utilisée.',
        };
      }
      if (exception.code === 'P2025') {
        return { type: PROBLEM_TYPES.notFound, title: TITLES[404]!, status: HttpStatus.NOT_FOUND };
      }
    }

    return { type: 'about:blank', title: TITLES[500]!, status: HttpStatus.INTERNAL_SERVER_ERROR };
  }
}
