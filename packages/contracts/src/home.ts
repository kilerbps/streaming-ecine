import { z } from 'zod';
import { imageSchema } from './common.js';
import { filmLanguageSchema, filmSummarySchema, personSummarySchema } from './content.js';

/**
 * Accueil en rangées (docs/design/04-ecrans-publics.md, Accueil). Les rangées automatiques sont
 * calculées par l'API à chaque lecture du cache ; Reprendre (propre à chaque personne) est ajoutée
 * par le site, en tête.
 */

/** Affiche à la une : programmée en administration, sinon les derniers films publiés (5 au plus). */
export const homeFeaturedSchema = z.object({
  film: filmSummarySchema,
  tagline: z.string().nullable(),
  titleImage: imageSchema.nullable(),
  audioLanguages: z.array(filmLanguageSchema),
  /** Faux pour un film annoncé ou sans vidéo prête : pas de bouton « Regarder ». */
  playable: z.boolean(),
});
export type HomeFeatured = z.infer<typeof homeFeaturedSchema>;

const films = z.array(filmSummarySchema);

export const homeRowSchema = z.discriminatedUnion('kind', [
  /** Top 10 en RDC cette semaine : dernier instantané quotidien, dans l'ordre des rangs. */
  z.object({ kind: z.literal('top10'), films }),
  /** Nouveautés : publiés depuis moins de 30 jours, le plus récent d'abord. */
  z.object({ kind: z.literal('new'), films }),
  /** Courts-métrages de 15 minutes ou moins. */
  z.object({ kind: z.literal('shorts'), films }),
  /** Bientôt : sortie annoncée, la plus proche d'abord. */
  z.object({ kind: z.literal('soon'), films }),
  /** Talents à l'honneur, programmés en administration. */
  z.object({ kind: z.literal('talents'), people: z.array(personSummarySchema) }),
  /** Rangée éditoriale nommée, programmée en administration. */
  z.object({ kind: z.literal('editorial'), id: z.string(), title: z.string(), films }),
  /** Rangée par catégorie. */
  z.object({ kind: z.literal('category'), slug: z.string(), name: z.string(), films }),
]);
export type HomeRow = z.infer<typeof homeRowSchema>;

export const homeSchema = z.object({
  featured: z.array(homeFeaturedSchema),
  rows: z.array(homeRowSchema),
});
export type Home = z.infer<typeof homeSchema>;
