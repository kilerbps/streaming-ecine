import { z } from 'zod';
import { imageSchema } from './common.js';
import { filmLanguageSchema, filmSummarySchema, personSummarySchema } from './content.js';

/**
 * Accueil en rangées (docs/design/04-ecrans-publics.md, Accueil). Les rangées automatiques sont
 * calculées par l'API à chaque lecture du cache ; Reprendre (propre à chaque personne) est ajoutée
 * par le site, en tête.
 */

/** Seuil d'une rangée de titres (ADR-0013) : sous ce nombre, la rangée n'est pas affichée. */
export const HOME_ROW_MIN_TITLES = 4;

/** Affiche à la une : programmée en administration, sinon les derniers films publiés (5 au plus). */
export const homeFeaturedSchema = z.object({
  film: filmSummarySchema,
  tagline: z.string().nullable(),
  titleImage: imageSchema.nullable(),
  audioLanguages: z.array(filmLanguageSchema),
  /** Faux pour un film annoncé ou sans vidéo prête : pas de bouton « Regarder ». */
  playable: z.boolean(),
  /**
   * Aperçu muet automatique (D-12, ADR-0015) : extrait statique d'un film lisible, sur un
   * emplacement programmé avec « Aperçu vidéo » ; `null` sinon (l'image reste seule). Absent d'une
   * réponse mise en cache avant son ajout : `null`.
   */
  previewUrl: z.string().nullable().default(null),
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

/** Données de personnalisation d'un visiteur (cookies de l'appareil, avec son accord). */
export const personalHomeInputSchema = z.strictObject({
  /** Films regardés au-delà de 10 min, le plus récent d'abord. */
  history: z.array(z.string().min(1).max(64)).max(20).default([]),
  /** « Pas pour moi » encore actifs. */
  dismissed: z.array(z.string().min(1).max(64)).max(100).default([]),
  /** Goûts choisis (catégories). */
  tastes: z.array(z.string().min(1).max(120)).max(8).default([]),
});
export type PersonalHomeInput = z.input<typeof personalHomeInputSchema>;

/**
 * Partie personnelle de l'accueil : « Parce que vous avez regardé {titre} », ordre des catégories par
 * affinité, titres à masquer (« Pas pour moi »). Pour un membre, calculée depuis son compte.
 */
export const personalHomeSchema = z.object({
  becauseWatched: z.object({ title: z.string(), films: z.array(filmSummarySchema) }).nullable(),
  categoryOrder: z.array(z.string()),
  hidden: z.array(z.string()),
});
export type PersonalHome = z.infer<typeof personalHomeSchema>;
