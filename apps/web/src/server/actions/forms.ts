'use server';

import { cookies } from 'next/headers';
import {
  analyticsEventInputSchema,
  CONSENT_VERSION,
  consentCategoriesSchema,
  contactInputSchema,
  type ConsentCategories,
} from '@ecine/contracts';
import { privateRequest } from '../api-client';
import { serverConfig } from '../config';
import { PREF_COOKIES } from '../cookie-names';
import { readConsent } from '../consent';
import { fromError, invalid, ok, type ActionResult } from './result';

export async function contactAction(input: unknown): Promise<ActionResult> {
  const parsed = contactInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    await privateRequest(null, '/contact', { method: 'POST', body: parsed.data });
    return ok(null);
  } catch (error) {
    return fromError(error);
  }
}

const CONSENT_MAX_AGE = 60 * 60 * 24 * 180; // 6 mois

/** Enregistre le choix cookies (cookie lisible côté serveur) et sa preuve (ConsentRecord côté API). */
export async function saveConsentAction(input: unknown): Promise<ActionResult<ConsentCategories>> {
  const parsed = consentCategoriesSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const jar = await cookies();
  let anonId = jar.get(PREF_COOKIES.anonId)?.value;
  if (!anonId || !/^[a-zA-Z0-9_-]{16,64}$/.test(anonId))
    anonId = crypto.randomUUID().replace(/-/g, '');
  const secure = serverConfig().COOKIE_SECURE;
  jar.set({
    name: PREF_COOKIES.anonId,
    value: anonId,
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: CONSENT_MAX_AGE,
  });
  jar.set({
    name: PREF_COOKIES.consent,
    value: JSON.stringify({ v: CONSENT_VERSION, a: parsed.data.analytics, p: parsed.data.ads }),
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: CONSENT_MAX_AGE,
  });
  try {
    await privateRequest(null, '/consent', {
      method: 'POST',
      body: { anonId, version: CONSENT_VERSION, categories: parsed.data },
    });
  } catch {
    // Le choix reste appliqué localement ; la preuve sera réenregistrée au prochain choix.
  }
  return ok(parsed.data);
}

/** Mesure d'audience : envoyée uniquement si le visiteur a accepté la catégorie « mesure d'audience ». */
export async function trackEventAction(input: unknown): Promise<void> {
  const consent = await readConsent();
  if (!consent?.analytics) return;
  const parsed = analyticsEventInputSchema.safeParse(input);
  if (!parsed.success) return;
  try {
    await privateRequest(null, '/analytics/events', { method: 'POST', body: parsed.data });
  } catch {
    // La mesure d'audience ne doit jamais gêner la navigation.
  }
}
