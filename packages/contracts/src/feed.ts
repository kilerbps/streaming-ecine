import { z } from 'zod';
import { articleSummarySchema, filmSummarySchema, postSchema } from './content.js';

/**
 * Élément du feed de découverte (docs/01-PRD.md §6.5).
 * `surprise` = créneau « hors habitudes » (~1 sur 6), `pinned` = épinglage éditorial.
 */
export const feedItemSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('film'),
    key: z.string(),
    surprise: z.boolean(),
    pinned: z.boolean(),
    film: filmSummarySchema.extend({ synopsis: z.string(), videoId: z.string().nullable() }),
  }),
  z.object({
    type: z.literal('post'),
    key: z.string(),
    surprise: z.boolean(),
    pinned: z.boolean(),
    post: postSchema,
  }),
  z.object({
    type: z.literal('article'),
    key: z.string(),
    surprise: z.boolean(),
    pinned: z.boolean(),
    article: articleSummarySchema,
  }),
]);
export type FeedItem = z.infer<typeof feedItemSchema>;

export const feedQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(30).default(12),
  cursor: z.string().max(512).optional(),
  /** Graine de tirage « surprise », stable pendant une visite (cookie), jamais seule source. */
  seed: z
    .string()
    .regex(/^[a-z0-9]{6,32}$/)
    .optional(),
});
export type FeedQuery = z.infer<typeof feedQuerySchema>;

export const feedPageSchema = z.object({
  items: z.array(feedItemSchema),
  nextCursor: z.string().nullable(),
});
export type FeedPage = z.infer<typeof feedPageSchema>;
