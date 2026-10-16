import 'server-only';
import { cookies } from 'next/headers';
import type { PersonalHomeInput } from '@ecine/contracts';
import { z } from 'zod';
import { dueTastesPrompt, type TastesPromptState } from '@/lib/tastes-prompt';
import { serverConfig } from './config';
import { readConsent } from './consent';
import { PERSONAL_COOKIES } from './cookie-names';

/** Cookies de l'appareil gardés 180 jours ; « Pas pour moi » : 40 titres au plus (taille du cookie). */
const MAX_AGE = 180 * 24 * 60 * 60;
export const HISTORY_MAX = 20;
export const DISMISSED_MAX = 40;
export const DISMISS_SECONDS = 90 * 24 * 60 * 60;

const id = z.string().regex(/^[a-z0-9]{8,40}$/);
const slug = z.string().regex(/^[a-z0-9-]{1,120}$/);
const historyCookie = z.array(id).max(HISTORY_MAX);
/** [identifiant, fin en secondes depuis l'époque]. */
const dismissedCookie = z.array(z.tuple([id, z.number().int()])).max(DISMISSED_MAX);
const tastesCookie = z.array(slug).max(8);
const watchedCategories = z.array(slug).max(3);
const tastesPromptCookie: z.ZodType<TastesPromptState> = z.union([
  z.object({ s: z.literal('due'), c: watchedCategories }),
  z.object({ s: z.literal('later'), c: watchedCategories, u: z.number().int() }),
  z.object({ s: z.literal('done') }),
]);

function parse<T>(schema: z.ZodType<T>, raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

/** La catégorie « Personnalisation » est-elle acceptée sur cet appareil ? */
export async function personalizationAllowed(): Promise<boolean> {
  return (await readConsent())?.personalization === true;
}

/** Signaux du visiteur pour l'accueil personnel ; `null` sans accord. */
export async function readPersonalSignals(): Promise<Required<PersonalHomeInput> | null> {
  if (!(await personalizationAllowed())) return null;
  const jar = await cookies();
  const now = Math.floor(Date.now() / 1000);
  return {
    history: parse(historyCookie, jar.get(PERSONAL_COOKIES.history)?.value, []),
    dismissed: parse(dismissedCookie, jar.get(PERSONAL_COOKIES.dismissed)?.value, [])
      .filter(([, until]) => until > now)
      .map(([filmId]) => filmId),
    tastes: parse(tastesCookie, jar.get(PERSONAL_COOKIES.tastes)?.value, []),
  };
}

async function write(name: string, value: unknown): Promise<void> {
  (await cookies()).set({
    name,
    value: JSON.stringify(value),
    httpOnly: true,
    secure: serverConfig().COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

/** Ajoute un film en tête de l'historique de l'appareil (20 au plus). */
export async function pushHistory(filmId: string): Promise<void> {
  const jar = await cookies();
  const current = parse(historyCookie, jar.get(PERSONAL_COOKIES.history)?.value, []);
  await write(
    PERSONAL_COOKIES.history,
    [filmId, ...current.filter((f) => f !== filmId)].slice(0, HISTORY_MAX),
  );
}

/** « Pas pour moi » sur l'appareil (90 jours), ou son annulation. */
export async function setDismissedCookie(filmId: string, dismissed: boolean): Promise<void> {
  const jar = await cookies();
  const now = Math.floor(Date.now() / 1000);
  const current = parse(dismissedCookie, jar.get(PERSONAL_COOKIES.dismissed)?.value, []).filter(
    ([f, until]) => until > now && f !== filmId,
  );
  const next = dismissed
    ? [[filmId, now + DISMISS_SECONDS] as [string, number], ...current]
    : current;
  await write(PERSONAL_COOKIES.dismissed, next.slice(0, DISMISSED_MAX));
}

export async function readTastesCookie(): Promise<string[]> {
  return parse(tastesCookie, (await cookies()).get(PERSONAL_COOKIES.tastes)?.value, []);
}

export async function writeTastesCookie(slugs: string[]): Promise<void> {
  await write(PERSONAL_COOKIES.tastes, slugs.slice(0, 8));
}

export async function readTastesPrompt(): Promise<TastesPromptState | null> {
  const raw = (await cookies()).get(PERSONAL_COOKIES.tastesPrompt)?.value;
  return parse<TastesPromptState | null>(tastesPromptCookie, raw, null);
}

export async function writeTastesPrompt(state: TastesPromptState): Promise<void> {
  await write(PERSONAL_COOKIES.tastesPrompt, state);
}

/** Catégories du film regardé quand la feuille des goûts est à proposer maintenant, sinon `null`. */
export async function readDueTastesPrompt(): Promise<string[] | null> {
  return dueTastesPrompt(await readTastesPrompt(), Math.floor(Date.now() / 1000));
}
