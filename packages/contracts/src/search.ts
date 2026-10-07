import { z } from 'zod';
import {
  articleSummarySchema,
  categorySchema,
  filmSummarySchema,
  personSummarySchema,
} from './content.js';

export const searchQuerySchema = z.strictObject({
  q: z.string().trim().min(2, 'Au moins 2 caractères').max(80),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;

/** Résultats groupés par type (FR-061). */
export const searchResultsSchema = z.object({
  q: z.string(),
  films: z.array(filmSummarySchema),
  people: z.array(personSummarySchema),
  articles: z.array(articleSummarySchema),
  categories: z.array(categorySchema),
});
export type SearchResults = z.infer<typeof searchResultsSchema>;
