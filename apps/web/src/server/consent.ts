import 'server-only';
import { cookies } from 'next/headers';
import { CONSENT_VERSION, type ConsentCategories } from '@ecine/contracts';
import { z } from 'zod';
import { PREF_COOKIES } from './cookie-names';

const stored = z.object({ v: z.string(), a: z.boolean(), p: z.boolean() });

/** Choix cookies en cours de validité (null = bannière à afficher). Une nouvelle version redemande l'accord. */
export async function readConsent(): Promise<ConsentCategories | null> {
  const raw = (await cookies()).get(PREF_COOKIES.consent)?.value;
  if (!raw) return null;
  try {
    const parsed = stored.parse(JSON.parse(raw));
    if (parsed.v !== CONSENT_VERSION) return null;
    return { necessary: true, analytics: parsed.a, ads: parsed.p };
  } catch {
    return null;
  }
}
