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
