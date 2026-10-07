import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../common/problem.js';

/** Problèmes propres aux envois de fichiers (RFC 9457). */
export const MEDIA_PROBLEM_TYPES = {
  unsupportedMedia: 'urn:ecine:problem:unsupported-media',
  uploadOffset: 'urn:ecine:problem:upload-offset',
  insufficientStorage: 'urn:ecine:problem:insufficient-storage',
} as const;

export function unsupportedMedia(detail: string): ProblemException {
  return new ProblemException({
    type: MEDIA_PROBLEM_TYPES.unsupportedMedia,
    title: 'Type de contenu non pris en charge',
    status: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    detail,
  });
}

/** Position d'envoi incorrecte : le client reprend à `receivedBytes` (indiqué dans le détail). */
export function offsetMismatch(receivedBytes: number): ProblemException {
  return new ProblemException({
    type: MEDIA_PROBLEM_TYPES.uploadOffset,
    title: 'Conflit',
    status: HttpStatus.CONFLICT,
    detail: `Position d’envoi incorrecte : reprenez à l’octet ${receivedBytes}.`,
    errors: [{ path: 'upload-offset', message: String(receivedBytes) }],
  });
}

export function insufficientStorage(): ProblemException {
  return new ProblemException({
    type: MEDIA_PROBLEM_TYPES.insufficientStorage,
    title: 'Espace de stockage insuffisant',
    status: HttpStatus.INSUFFICIENT_STORAGE,
    detail:
      'Le serveur manque d’espace disque pour recevoir ce fichier. Contactez l’administrateur technique.',
  });
}
