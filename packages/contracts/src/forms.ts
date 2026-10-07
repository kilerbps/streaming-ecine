import { z } from 'zod';
import { emailSchema } from './auth.js';

/** Formulaire de contact (FR-070) : validé à l'identique côté client et serveur. */
export const contactInputSchema = z.strictObject({
  name: z.string().trim().min(2, 'Au moins 2 caractères').max(80, 'Au plus 80 caractères'),
  email: emailSchema,
  subject: z.string().trim().min(3, 'Au moins 3 caractères').max(120, 'Au plus 120 caractères'),
  message: z.string().trim().min(20, 'Au moins 20 caractères').max(4000, 'Au plus 4000 caractères'),
  /** Jeton Cloudflare Turnstile. */
  turnstileToken: z.string().max(4096).optional(),
  /** Pot de miel : doit rester vide. */
  website: z.string().max(0).optional(),
  /** Horodatage d'affichage du formulaire (ms) : délai minimal de saisie. */
  renderedAt: z.number().int().positive(),
});
export type ContactInput = z.infer<typeof contactInputSchema>;

export const CONSENT_VERSION = '2026-10-02';
export const consentCategoriesSchema = z.strictObject({
  necessary: z.literal(true),
  analytics: z.boolean(),
  ads: z.boolean(),
});
export type ConsentCategories = z.infer<typeof consentCategoriesSchema>;

export const consentInputSchema = z.strictObject({
  anonId: z.string().regex(/^[a-zA-Z0-9_-]{16,64}$/),
  version: z.string().max(32),
  categories: consentCategoriesSchema,
});
export type ConsentInput = z.infer<typeof consentInputSchema>;

export const analyticsEventInputSchema = z.strictObject({
  type: z.enum(['page_view', 'play_start', 'play_complete', 'search', 'share']),
  path: z.string().max(512).optional(),
  targetType: z.enum(['FILM', 'POST', 'ARTICLE', 'PERSON']).optional(),
  targetId: z.string().max(64).optional(),
  referrer: z.string().max(512).optional(),
});
export type AnalyticsEventInput = z.infer<typeof analyticsEventInputSchema>;
