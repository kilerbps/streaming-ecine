'use server';

import {
  dismissalStateSchema,
  idSchema,
  slugSchema,
  tastesSchema,
  type DismissalState,
  type Tastes,
} from '@ecine/contracts';
import { z } from 'zod';
import { afterTastesPrompt, TASTES_SUGGESTED } from '@/lib/tastes-prompt';
import { privateRequest } from '../api-client';
import { getViewer } from '../data';
import {
  personalizationAllowed,
  pushHistory,
  readTastesPrompt,
  setDismissedCookie,
  writeTastesCookie,
  writeTastesPrompt,
} from '../personalization';
import { fromError, invalid, ok, type ActionResult } from './result';

const NO_CONSENT: ActionResult<never> = {
  ok: false,
  code: 'conflict',
  error: 'Activez « Personnalisation » dans les cookies pour garder ce choix sur cet appareil.',
};

const watchedSchema = z.object({ filmId: idSchema, categories: z.array(slugSchema).max(20) });

/**
 * Film regardé au-delà de 10 min :
 * - visiteur ayant accepté « Personnalisation » : en tête de l'historique de l'appareil (un membre
 *   n'en a pas besoin, son compte garde déjà sa progression) ;
 * - premier film, quand les goûts peuvent être gardés (membre, ou visiteur ayant accepté) : la
 *   feuille « Qu'aimez-vous regarder ? » sera proposée au retour sur l'accueil (R-ENG-11).
 */
export async function filmWatchedAction(input: unknown): Promise<ActionResult> {
  const parsed = watchedSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const member = Boolean(await getViewer());
  const allowed = member || (await personalizationAllowed());
  if (!allowed) return ok(null);
  if (!member) await pushHistory(parsed.data.filmId);
  if (!(await readTastesPrompt())) {
    await writeTastesPrompt({ s: 'due', c: parsed.data.categories.slice(0, TASTES_SUGGESTED) });
  }
  return ok(null);
}

/** Feuille des goûts close : enregistrée, ou « Plus tard » (repoussée de 7 jours, une seule fois). */
export async function closeTastesPromptAction(choice: unknown): Promise<ActionResult> {
  const parsed = z.enum(['saved', 'later']).safeParse(choice);
  if (!parsed.success) return invalid(parsed.error);
  const state = await readTastesPrompt();
  if (state) {
    await writeTastesPrompt(afterTastesPrompt(state, parsed.data, Math.floor(Date.now() / 1000)));
  }
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
