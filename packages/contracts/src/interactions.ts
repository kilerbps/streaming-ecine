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
