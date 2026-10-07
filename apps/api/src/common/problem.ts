import { HttpException, HttpStatus } from '@nestjs/common';
import type { Problem } from '@ecine/contracts';

/** Types de problèmes propres à E-Ciné (RFC 9457 §3.1.1). */
export const PROBLEM_TYPES = {
  validation: 'urn:ecine:problem:validation',
  rateLimit: 'urn:ecine:problem:rate-limit',
  unauthenticated: 'urn:ecine:problem:unauthenticated',
  forbidden: 'urn:ecine:problem:forbidden',
  notFound: 'urn:ecine:problem:not-found',
  conflict: 'urn:ecine:problem:conflict',
  locked: 'urn:ecine:problem:account-locked',
  mfaRequired: 'urn:ecine:problem:mfa-required',
  publishBlocked: 'urn:ecine:problem:publish-blocked',
} as const;

/** Exception métier sérialisée telle quelle au format problem+json. */
export class ProblemException extends HttpException {
  constructor(public readonly problem: Omit<Problem, 'instance'>) {
    super(problem, problem.status);
  }

  static badRequest(detail: string, errors?: Problem['errors']) {
    return new ProblemException({
      type: PROBLEM_TYPES.validation,
      title: 'Requête invalide',
      status: HttpStatus.BAD_REQUEST,
      detail,
      errors,
    });
  }

  static unauthorized(detail = 'Connexion requise.') {
    return new ProblemException({
      type: PROBLEM_TYPES.unauthenticated,
      title: 'Non authentifié',
      status: HttpStatus.UNAUTHORIZED,
      detail,
    });
  }

  static forbidden(detail = 'Action non autorisée.') {
    return new ProblemException({
      type: PROBLEM_TYPES.forbidden,
      title: 'Accès refusé',
      status: HttpStatus.FORBIDDEN,
      detail,
    });
  }

  static notFound(detail = 'Ressource introuvable.') {
    return new ProblemException({
      type: PROBLEM_TYPES.notFound,
      title: 'Introuvable',
      status: HttpStatus.NOT_FOUND,
      detail,
    });
  }

  static conflict(detail: string) {
    return new ProblemException({
      type: PROBLEM_TYPES.conflict,
      title: 'Conflit',
      status: HttpStatus.CONFLICT,
      detail,
    });
  }

  static tooManyRequests(detail = 'Trop de requêtes. Réessayez dans un instant.') {
    return new ProblemException({
      type: PROBLEM_TYPES.rateLimit,
      title: 'Trop de requêtes',
      status: HttpStatus.TOO_MANY_REQUESTS,
      detail,
    });
  }
}
