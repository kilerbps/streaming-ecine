import { type PipeTransform } from '@nestjs/common';
import type { z } from 'zod';
import { ProblemException } from './problem.js';

/**
 * Valide une entrée (body, query, params) avec un schéma de `@ecine/contracts`.
 * Les champs inconnus sont rejetés par les schémas stricts ; les erreurs sont liées aux champs.
 */
export class ZodPipe<T extends z.ZodType> implements PipeTransform<unknown, z.infer<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;
    throw ProblemException.badRequest(
      'Certaines informations sont invalides.',
      result.error.issues.map((issue) => ({
        path: issue.path.map(String).join('.') || '(racine)',
        message: issue.message,
      })),
    );
  }
}
