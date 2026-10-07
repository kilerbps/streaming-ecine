import type { z } from 'zod';
import { ProblemException } from './problem.js';

/** Curseur opaque : JSON encodé en base64url, validé au décodage (jamais confié aveuglément à la base). */
export function encodeCursor(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

export function decodeCursor<T extends z.ZodType>(
  cursor: string | undefined,
  schema: T,
): z.infer<T> | null {
  if (!cursor) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')));
    if (parsed.success) return parsed.data;
  } catch {
    // curseur illisible : traité comme invalide ci-dessous
  }
  throw ProblemException.badRequest('Curseur de pagination invalide.');
}
