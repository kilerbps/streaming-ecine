import { z } from 'zod';
import { imageSchema, slugSchema, socialsSchema } from './common.js';

export const filmKindSchema = z.enum(['FEATURE', 'SHORT', 'DOCUMENTARY', 'SERIES_EPISODE']);
export type FilmKind = z.infer<typeof filmKindSchema>;

export const creditRoleSchema = z.enum([
  'ACTOR',
  'DIRECTOR',
  'PRODUCER',
  'WRITER',
  'CINEMATOGRAPHER',
  'EDITOR',
  'COMPOSER',
  'OTHER',
]);
export type CreditRole = z.infer<typeof creditRoleSchema>;

export const articleKindSchema = z.enum(['NEWS', 'ANNOUNCEMENT', 'EVENT']);
export type ArticleKind = z.infer<typeof articleKindSchema>;

export const categorySchema = z.object({ slug: z.string(), name: z.string() });

/**
 * Langues des films (audio et sous-titres) : français, langues nationales de la RDC (lingala,
 * kiswahili, kikongo, tshiluba) et anglais. Codes ISO 639.
 */
export const FILM_LANGUAGES = ['fr', 'ln', 'sw', 'kg', 'lua', 'en'] as const;
export const filmLanguageSchema = z.enum(FILM_LANGUAGES);
export type FilmLanguage = z.infer<typeof filmLanguageSchema>;
export type Category = z.infer<typeof categorySchema>;

/** Catégorie pour l'exploration (recherche) : nombre de titres visibles et affiche du plus récent. */
export const categoryOverviewSchema = categorySchema.extend({
  filmCount: z.number().int().nonnegative(),
  cover: imageSchema.nullable(),
});
export type CategoryOverview = z.infer<typeof categoryOverviewSchema>;

/** Tuile film (listes, feed, recherche) : objet allégé. */
export const filmSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  kind: filmKindSchema,
  title: z.string(),
  year: z.number().int().nullable(),
  runtimeSec: z.number().int().nullable(),
  poster: imageSchema.nullable(),
  categories: z.array(categorySchema),
  /** Date de mise en ligne (badge « Nouveau » pendant 30 jours). */
  publishedAt: z.string().nullable(),
  /** Sortie annoncée : dans le futur, le film est « Bientôt » (rappels, pas de lecture). */
  releaseAt: z.string().nullable(),
});
export type FilmSummary = z.infer<typeof filmSummarySchema>;

export const creditSchema = z.object({
  role: creditRoleSchema,
  character: z.string().nullable(),
  person: z.object({ slug: z.string(), name: z.string(), photo: imageSchema.nullable() }),
});
export type Credit = z.infer<typeof creditSchema>;

export const filmDetailSchema = filmSummarySchema.extend({
  originalTitle: z.string().nullable(),
  synopsis: z.string(),
  /** Phrase d'accroche (80 caractères au plus) : affiche à la une, Découvrir. */
  tagline: z.string().nullable(),
  ageRating: z.string().nullable(),
  audioLanguages: z.array(filmLanguageSchema),
  subtitleLanguages: z.array(filmLanguageSchema),
  filmingLocation: z.string().nullable(),
  /** Titre dessiné (PNG ou SVG transparent) qui remplace le titre écrit. */
  titleImage: imageSchema.nullable(),
  /** Début du générique (« À suivre » dans le lecteur) ; repli : 30 s avant la fin. */
  creditsStartSec: z.number().int().nullable(),
  /** Fin de disponibilité réelle, affichée seulement si elle existe. */
  availableUntil: z.string().nullable(),
  trailerUrl: z.string().nullable(),
  /** Identifiant de la vidéo lisible (null si aucune vidéo prête). Jamais de chemin de stockage. */
  videoId: z.string().nullable(),
  credits: z.array(creditSchema),
  seo: z.object({
    title: z.string().nullable(),
    description: z.string().nullable(),
    noIndex: z.boolean(),
  }),
  updatedAt: z.string(),
  likeCount: z.number().int().nonnegative(),
});
export type FilmDetail = z.infer<typeof filmDetailSchema>;

export const filmListQuerySchema = z.strictObject({
  kind: filmKindSchema.optional(),
  category: slugSchema.optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(24),
  cursor: z.string().max(512).optional(),
});
export type FilmListQuery = z.infer<typeof filmListQuerySchema>;

export const personSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  photo: imageSchema.nullable(),
  roles: z.array(creditRoleSchema),
});
export type PersonSummary = z.infer<typeof personSummarySchema>;

export const filmographyEntrySchema = z.object({
  role: creditRoleSchema,
  character: z.string().nullable(),
  film: filmSummarySchema,
});

export const personDetailSchema = personSummarySchema.extend({
  bio: z.string(),
  birthYear: z.number().int().nullable(),
  socials: socialsSchema,
  filmography: z.array(filmographyEntrySchema),
  updatedAt: z.string(),
});
export type PersonDetail = z.infer<typeof personDetailSchema>;

export const articleSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  kind: articleKindSchema,
  title: z.string(),
  excerpt: z.string(),
  cover: imageSchema.nullable(),
  publishedAt: z.string(),
  eventStart: z.string().nullable(),
  eventPlace: z.string().nullable(),
});
export type ArticleSummary = z.infer<typeof articleSummarySchema>;

export const articleDetailSchema = articleSummarySchema.extend({
  /** Corps en Markdown restreint ; rendu côté serveur avec liste blanche. */
  body: z.string(),
  author: z.object({ name: z.string() }),
  featuredFilm: filmSummarySchema.nullable(),
  seo: z.object({ title: z.string().nullable(), description: z.string().nullable() }),
  updatedAt: z.string(),
});
export type ArticleDetail = z.infer<typeof articleDetailSchema>;

export const articleListQuerySchema = z.strictObject({
  kind: articleKindSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  cursor: z.string().max(512).optional(),
});

export const postSchema = z.object({
  id: z.string(),
  caption: z.string(),
  images: z.array(imageSchema).min(1).max(10),
  publishedAt: z.string(),
  likeCount: z.number().int().nonnegative(),
});
export type Post = z.infer<typeof postSchema>;

export const teamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  bio: z.string().nullable(),
  photo: imageSchema.nullable(),
});
export type TeamMember = z.infer<typeof teamMemberSchema>;

export const staticPageSchema = z.object({
  slug: z.string(),
  title: z.string(),
  /** Markdown restreint. */
  body: z.string(),
  version: z.number().int(),
  updatedAt: z.string(),
});
export type StaticPage = z.infer<typeof staticPageSchema>;

export const siteSettingsSchema = z.object({
  contactEmail: z.string(),
  phone: z.string().nullable(),
  socials: socialsSchema,
  adsEnabled: z.boolean(),
});
export type SiteSettings = z.infer<typeof siteSettingsSchema>;

/** Film annoncé (Nouveautés → Bientôt) : tuile 16:9, date de sortie, genre, langue, synopsis court. */
export const upcomingFilmSchema = filmSummarySchema.extend({
  releaseAt: z.string(),
  synopsis: z.string(),
  audioLanguages: z.array(filmLanguageSchema),
});
export type UpcomingFilm = z.infer<typeof upcomingFilmSchema>;

/** Événement à venir (avant-première, projection, festival), avec le film lié s'il y en a un. */
export const upcomingEventSchema = articleSummarySchema.extend({
  eventStart: z.string(),
  featuredFilm: z.object({ slug: z.string(), title: z.string() }).nullable(),
});
export type UpcomingEvent = z.infer<typeof upcomingEventSchema>;

/** Nouveautés : films annoncés (sortie la plus proche d'abord) et événements à venir (prochain d'abord). */
export const whatsNewSchema = z.object({
  films: z.array(upcomingFilmSchema),
  events: z.array(upcomingEventSchema),
});
export type WhatsNew = z.infer<typeof whatsNewSchema>;
