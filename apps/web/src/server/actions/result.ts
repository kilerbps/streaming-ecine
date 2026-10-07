import 'server-only';
import { PROBLEM } from '@/lib/problem-types';
import type { z } from 'zod';
import { ApiError } from '../api-client';

/** Résultat d'une Server Action : les erreurs attendues sont des valeurs, jamais des exceptions. */
export type ActionResult<T = null> =
  | { ok: true; data: T }
  | {
      ok: false;
      code: 'auth' | 'mfa' | 'rate' | 'validation' | 'conflict' | 'not_found' | 'unknown';
      error: string;
      fieldErrors?: Record<string, string>;
    };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function invalid<T>(error: z.ZodError): ActionResult<T> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.') || 'form';
    fieldErrors[key] ??= issue.message;
  }
  return {
    ok: false,
    code: 'validation',
    error: 'Certaines informations sont à corriger.',
    fieldErrors,
  };
}

/** Convertit une erreur d'API (RFC 9457) en résultat lisible ; les erreurs inattendues sont relancées. */
export function fromError<T>(error: unknown): ActionResult<T> {
  if (!(error instanceof ApiError)) throw error;
  const { problem } = error;
  const fieldErrors = problem.errors?.length
    ? Object.fromEntries(problem.errors.map((e) => [e.path, e.message]))
    : undefined;
  const code =
    problem.type === PROBLEM.mfaRequired
      ? 'mfa'
      : problem.status === 401
        ? 'auth'
        : problem.status === 429
          ? 'rate'
          : problem.status === 400 || problem.status === 422
            ? 'validation'
            : problem.status === 409
              ? 'conflict'
              : problem.status === 404
                ? 'not_found'
                : 'unknown';
  const fallback =
    code === 'unknown' ? 'Une erreur est survenue. Réessayez dans un instant.' : problem.title;
  return { ok: false, code, error: problem.detail ?? fallback, fieldErrors };
}
