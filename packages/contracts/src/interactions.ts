import { z } from 'zod';
import { idSchema } from './common.js';
import { filmSummarySchema } from './content.js';

export const likeTargetTypeSchema = z.enum(['FILM', 'POST', 'ARTICLE']);
export type LikeTargetType = z.infer<typeof likeTargetTypeSchema>;

export const likeParamsSchema = z.strictObject({
  targetType: likeTargetTypeSchema,
  targetId: idSchema,
});
export const likeStateSchema = z.object({
  liked: z.boolean(),
  likeCount: z.number().int().nonnegative(),
});
export type LikeState = z.infer<typeof likeStateSchema>;

export const bookmarkStateSchema = z.object({ bookmarked: z.boolean() });
export type BookmarkState = z.infer<typeof bookmarkStateSchema>;

export const progressInputSchema = z.strictObject({
  positionSec: z
    .number()
    .int()
    .min(0)
    .max(60 * 60 * 12),
});
export type ProgressInput = z.infer<typeof progressInputSchema>;

export const continueWatchingItemSchema = z.object({
  film: filmSummarySchema,
  positionSec: z.number().int(),
  updatedAt: z.string(),
});
export type ContinueWatchingItem = z.infer<typeof continueWatchingItemSchema>;

/** État personnel d'un contenu pour l'utilisateur connecté (jamais mis en cache public). */
export const viewerStateSchema = z.object({
  liked: z.boolean(),
  bookmarked: z.boolean(),
  positionSec: z.number().int().nullable(),
});
export type ViewerState = z.infer<typeof viewerStateSchema>;

export const reportReasonSchema = z.enum(['RIGHTS', 'INAPPROPRIATE', 'SPAM', 'OTHER']);
export const reportInputSchema = z.strictObject({
  targetType: z.enum(['FILM', 'POST', 'ARTICLE', 'PERSON']),
  targetId: idSchema,
  reason: reportReasonSchema,
  details: z.string().trim().max(1000).optional(),
});
export type ReportInput = z.infer<typeof reportInputSchema>;

/** « Me le rappeler » : rappel d'un membre pour un film annoncé, envoyé le jour de la sortie. */
export const reminderStateSchema = z.object({ reminded: z.boolean() });
export type ReminderState = z.infer<typeof reminderStateSchema>;

/** « Pas pour moi » : le titre quitte les rangées de l'accueil pendant 90 jours. */
export const DISMISS_DAYS = 90;
export const dismissalStateSchema = z.object({ dismissed: z.boolean() });
export type DismissalState = z.infer<typeof dismissalStateSchema>;

/** Goûts (choix des catégories), modifiables dans Réglages. */
export const TASTES_MAX = 8;
export const tastesSchema = z.object({
  categories: z.array(z.string().min(1).max(120)).max(TASTES_MAX),
});
export type Tastes = z.infer<typeof tastesSchema>;

/**
 * Services push des navigateurs acceptés (Chrome/Android, Firefox, Safari, Edge) : l'API n'envoie
 * jamais de requête vers une autre adresse (protection SSRF).
 */
export const PUSH_SERVICE_HOSTS = [
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
  'notify.windows.com',
] as const;

export function isPushServiceUrl(value: string): boolean {
  // Hôte en minuscules, sans identifiants ni port : https://hôte/…
  const host = /^https:\/\/([a-z0-9.-]+)\//.exec(value)?.[1];
  if (!host) return false;
  return PUSH_SERVICE_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

/** Abonnement Web Push d'un appareil (PushSubscription.toJSON() du navigateur). */
export const pushSubscriptionInputSchema = z.strictObject({
  endpoint: z.string().max(1024).refine(isPushServiceUrl, 'Service de notification non reconnu.'),
  expirationTime: z.number().nullable().optional(),
  keys: z.strictObject({
    p256dh: z.string().min(40).max(200),
    auth: z.string().min(10).max(100),
  }),
});
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionInputSchema>;

export const pushUnsubscribeSchema = z.strictObject({ endpoint: z.string().max(1024) });

/** Clé publique VAPID ; `null` quand les notifications sont désactivées sur le serveur. */
export const pushKeySchema = z.object({ publicKey: z.string().nullable() });
export type PushKey = z.infer<typeof pushKeySchema>;
