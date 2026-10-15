'use server';

import {
  pushKeySchema,
  pushSubscriptionInputSchema,
  pushUnsubscribeSchema,
} from '@ecine/contracts';
import { privateRequest, publicGet } from '../api-client';
import { fromError, invalid, ok, type ActionResult } from './result';

/** Clé publique VAPID (publique par nature), `null` si les notifications sont désactivées. */
export async function pushKeyAction(): Promise<string | null> {
  try {
    return (await publicGet(pushKeySchema, '/push/key', { revalidate: 3600 })).publicKey;
  } catch {
    return null;
  }
}

/** Enregistre l'abonnement de cet appareil pour le membre connecté (rappels de sortie). */
export async function savePushSubscriptionAction(input: unknown): Promise<ActionResult> {
  const parsed = pushSubscriptionInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    await privateRequest(null, '/me/push-subscriptions', { method: 'POST', body: parsed.data });
    return ok(null);
  } catch (error) {
    return fromError(error);
  }
}

export async function removePushSubscriptionAction(endpoint: string): Promise<ActionResult> {
  const parsed = pushUnsubscribeSchema.safeParse({ endpoint });
  if (!parsed.success) return invalid(parsed.error);
  try {
    await privateRequest(null, '/me/push-subscriptions', { method: 'DELETE', body: parsed.data });
    return ok(null);
  } catch (error) {
    return fromError(error);
  }
}
