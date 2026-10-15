'use server';

import {
  dismissalStateSchema,
  idSchema,
  tastesSchema,
  type DismissalState,
  type Tastes,
} from '@ecine/contracts';
import { privateRequest } from '../api-client';
import { getViewer } from '../data';
import {
  personalizationAllowed,
  pushHistory,
  setDismissedCookie,
  writeTastesCookie,
} from '../personalization';
import { fromError, invalid, ok, type ActionResult } from './result';

const NO_CONSENT: ActionResult<never> = {
  ok: false,
  code: 'conflict',
  error: 'Activez « Personnalisation » dans les cookies pour garder ce choix sur cet appareil.',
};

/**
 * Film regardé au-delà de 10 min : en tête de l'historique de l'appareil (visiteur ayant accepté
 * « Personnalisation »). Pour un membre, rien à faire : son compte garde déjà sa progression.
 */
export async function recordHistoryAction(filmId: string): Promise<ActionResult> {
  const parsed = idSchema.safeParse(filmId);
  if (!parsed.success) return invalid(parsed.error);
  if (await getViewer()) return ok(null);
  if (await personalizationAllowed()) await pushHistory(parsed.data);
  return ok(null);
}

/** « Pas pour moi » (90 jours) ou son annulation : compte du membre, sinon cookie de l'appareil. */
export async function dismissFilmAction(
  filmId: string,
  dismissed: boolean,
): Promise<ActionResult<DismissalState>> {
  const parsed = idSchema.safeParse(filmId);
  if (!parsed.success) return invalid(parsed.error);
  if (await getViewer()) {
    try {
      return ok(
        await privateRequest(
          dismissalStateSchema,
          `/me/dismissals/${encodeURIComponent(parsed.data)}`,
          { method: dismissed ? 'PUT' : 'DELETE' },
        ),
      );
    } catch (error) {
      return fromError(error);
    }
  }
  if (!(await personalizationAllowed())) return NO_CONSENT;
  await setDismissedCookie(parsed.data, dismissed);
  return ok({ dismissed });
}

/** Goûts (catégories) : compte du membre, sinon cookie de l'appareil. */
export async function setTastesAction(input: unknown): Promise<ActionResult<Tastes>> {
  const parsed = tastesSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (await getViewer()) {
    try {
      return ok(
        await privateRequest(tastesSchema, '/me/tastes', { method: 'PUT', body: parsed.data }),
      );
    } catch (error) {
      return fromError(error);
    }
  }
  if (!(await personalizationAllowed())) return NO_CONSENT;
  await writeTastesCookie(parsed.data.categories);
  return ok(parsed.data);
}
