import { z } from 'zod';
import {
  focalPointSchema,
  idSchema,
  imageCropsSchema,
  imageSchema,
  isoDateSchema,
  publishStateSchema,
  roleSchema,
  slugSchema,
  socialsSchema,
} from './common.js';
import {
  articleKindSchema,
  creditRoleSchema,
  FILM_LANGUAGES,
  filmKindSchema,
  filmLanguageSchema,
} from './content.js';

const seoTitle = z.string().trim().max(60, 'Au plus 60 caractères').optional();
const seoDescription = z.string().trim().max(160, 'Au plus 160 caractères').optional();

/** Confirmation explicite exigée pour toute suppression (docs/04-API-SPEC.md §3). */
export const confirmQuerySchema = z.strictObject({ confirm: z.literal('true') });

export const adminListQuerySchema = z.strictObject({
  q: z.string().trim().max(80).optional(),
  state: publishStateSchema.optional(),
  includeDeleted: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(25),
  cursor: z.string().max(512).optional(),
});
export type AdminListQuery = z.infer<typeof adminListQuerySchema>;

export const adminRowSchema = z.object({
  id: z.string(),
  slug: z.string().nullable(),
  title: z.string(),
  state: publishStateSchema.nullable(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  meta: z.string().nullable(),
});
export type AdminRow = z.infer<typeof adminRowSchema>;

// ——— Films ———

export const creditInputSchema = z.strictObject({
  personId: idSchema,
  role: creditRoleSchema,
  character: z.string().trim().max(120).optional(),
  position: z.number().int().min(0).max(999).default(0),
});

export const filmInputSchema = z.strictObject({
  slug: slugSchema,
  kind: filmKindSchema,
  title: z.string().trim().min(1, 'Titre requis').max(200),
  synopsis: z.string().trim().min(1, 'Résumé requis').max(5000),
  originalTitle: z.string().trim().max(200).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  runtimeSec: z
    .number()
    .int()
    .min(1)
    .max(60 * 60 * 12)
    .optional(),
  ageRating: z.string().trim().max(10).optional(),
  tagline: z.string().trim().max(80, 'Phrase d’accroche : 80 caractères au plus').optional(),
  audioLanguages: z.array(filmLanguageSchema).max(FILM_LANGUAGES.length).default([]),
  subtitleLanguages: z.array(filmLanguageSchema).max(FILM_LANGUAGES.length).default([]),
  filmingLocation: z.string().trim().max(120).optional(),
  titleImageId: idSchema.optional(),
  creditsStartSec: z
    .number()
    .int()
    .min(1)
    .max(60 * 60 * 12)
    .optional(),
  /** Début de l'aperçu promotionnel (ADR-0015) ; absent : pas d'aperçu. */
  previewStartSec: z
    .number()
    .int()
    .min(0)
    .max(60 * 60 * 12)
    .optional(),
  releaseAt: isoDateSchema.optional(),
  availableUntil: isoDateSchema.optional(),
  trailerUrl: z.url().optional(),
  rightsNote: z
    .string()
    .trim()
    .min(10, 'Décrivez la preuve d’autorisation (10 caractères min.)')
    .max(2000),
  rightsOk: z.boolean(),
  posterId: idSchema.optional(),
  categoryIds: z.array(idSchema).max(10).default([]),
  credits: z.array(creditInputSchema).max(200).default([]),
  seoTitle,
  seoDescription,
  seoNoIndex: z.boolean().default(false),
});
export type FilmInput = z.infer<typeof filmInputSchema>;

export const adminFilmSchema = z.object({
  id: z.string(),
  slug: z.string(),
  kind: filmKindSchema,
  state: publishStateSchema,
  publishAt: z.string().nullable(),
  title: z.string(),
  synopsis: z.string(),
  originalTitle: z.string().nullable(),
  year: z.number().int().nullable(),
  runtimeSec: z.number().int().nullable(),
  ageRating: z.string().nullable(),
  tagline: z.string().nullable(),
  audioLanguages: z.array(filmLanguageSchema),
  subtitleLanguages: z.array(filmLanguageSchema),
  filmingLocation: z.string().nullable(),
  titleImage: imageSchema.extend({ id: z.string() }).nullable(),
  creditsStartSec: z.number().int().nullable(),
  previewStartSec: z.number().int().nullable(),
  /** Aperçu généré (null tant que le worker ne l'a pas produit, ou sans début choisi). */
  previewUrl: z.string().nullable(),
  releaseAt: z.string().nullable(),
  availableUntil: z.string().nullable(),
  trailerUrl: z.string().nullable(),
  rightsNote: z.string(),
  rightsOk: z.boolean(),
  poster: imageSchema.extend({ id: z.string() }).nullable(),
  categoryIds: z.array(z.string()),
  credits: z.array(
    z.object({
      personId: z.string(),
      personName: z.string(),
      role: creditRoleSchema,
      character: z.string().nullable(),
      position: z.number().int(),
    }),
  ),
  videos: z.array(
    z.object({
      id: z.string(),
      state: z.enum(['PENDING', 'PROCESSING', 'READY', 'FAILED']),
      durationSec: z.number().int().nullable(),
      error: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  seoNoIndex: z.boolean(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});
export type AdminFilm = z.infer<typeof adminFilmSchema>;

export const scheduleInputSchema = z.strictObject({ publishAt: isoDateSchema });

/** Liste de ce qui manque avant publication (contrôles de docs/03-DATA-MODEL.md §4). */
export const publishCheckSchema = z.object({
  ok: z.boolean(),
  missing: z.array(z.string()),
});
export type PublishCheck = z.infer<typeof publishCheckSchema>;

// ——— Personnes ———

export const personInputSchema = z.strictObject({
  slug: slugSchema,
  name: z.string().trim().min(1, 'Nom requis').max(120),
  bio: z.string().trim().max(10000).default(''),
  birthYear: z.number().int().min(1900).max(2100).optional(),
  photoId: idSchema.optional(),
  socials: socialsSchema.default({}),
});
export type PersonInput = z.infer<typeof personInputSchema>;

export const adminPersonSchema = z.object({
  id: z.string(),
  slug: z.string(),
  state: publishStateSchema,
  name: z.string(),
  bio: z.string(),
  birthYear: z.number().int().nullable(),
  photo: imageSchema.extend({ id: z.string() }).nullable(),
  socials: socialsSchema,
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});
export type AdminPerson = z.infer<typeof adminPersonSchema>;

// ——— Actualités ———

export const articleInputSchema = z.strictObject({
  slug: slugSchema,
  kind: articleKindSchema,
  title: z.string().trim().min(1, 'Titre requis').max(200),
  excerpt: z.string().trim().min(1, 'Chapeau requis').max(300),
  body: z.string().trim().min(1, 'Texte requis').max(50000),
  coverId: idSchema.optional(),
  eventStart: isoDateSchema.optional(),
  eventPlace: z.string().trim().max(200).optional(),
  featuredFilmId: idSchema.optional(),
  seoTitle,
  seoDescription,
});
export type ArticleInput = z.infer<typeof articleInputSchema>;

export const adminArticleSchema = z.object({
  id: z.string(),
  slug: z.string(),
  kind: articleKindSchema,
  state: publishStateSchema,
  publishAt: z.string().nullable(),
  title: z.string(),
  excerpt: z.string(),
  body: z.string(),
  cover: imageSchema.extend({ id: z.string() }).nullable(),
  eventStart: z.string().nullable(),
  eventPlace: z.string().nullable(),
  featuredFilmId: z.string().nullable(),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});
export type AdminArticle = z.infer<typeof adminArticleSchema>;

// ——— Publications du feed ———

export const postInputSchema = z.strictObject({
  caption: z.string().trim().min(1, 'Légende requise').max(2200),
  imageIds: z.array(idSchema).min(1, 'Au moins une image').max(10, 'Au plus 10 images'),
  pinnedUntil: isoDateSchema.optional(),
});
export type PostInput = z.infer<typeof postInputSchema>;

export const adminPostSchema = z.object({
  id: z.string(),
  state: publishStateSchema,
  publishAt: z.string().nullable(),
  caption: z.string(),
  images: z.array(imageSchema.extend({ id: z.string() })),
  pinnedUntil: z.string().nullable(),
  createdAt: z.string(),
  deletedAt: z.string().nullable(),
});
export type AdminPost = z.infer<typeof adminPostSchema>;

// ——— Référentiels ———

export const categoryInputSchema = z.strictObject({
  slug: slugSchema,
  name: z.string().trim().min(1).max(80),
});
export const adminCategorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  filmCount: z.number().int(),
});
export type AdminCategory = z.infer<typeof adminCategorySchema>;

export const teamMemberInputSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(120),
  bio: z.string().trim().max(2000).optional(),
  photoId: idSchema.optional(),
  position: z.number().int().min(0).max(999).default(0),
  visible: z.boolean().default(true),
});
export const adminTeamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  bio: z.string().nullable(),
  photo: imageSchema.extend({ id: z.string() }).nullable(),
  position: z.number().int(),
  visible: z.boolean(),
});
export type AdminTeamMember = z.infer<typeof adminTeamMemberSchema>;

export const staticPageInputSchema = z.strictObject({
  slug: slugSchema,
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(100000),
});
export const adminStaticPageSchema = z.object({
  id: z.string(),
  slug: z.string(),
  state: publishStateSchema,
  title: z.string(),
  body: z.string(),
  version: z.number().int(),
  updatedAt: z.string(),
});
export type AdminStaticPage = z.infer<typeof adminStaticPageSchema>;

export const siteSettingsInputSchema = z.strictObject({
  contactEmail: z.email(),
  phone: z.string().trim().max(40).optional(),
  socials: socialsSchema.default({}),
  adsEnabled: z.boolean(),
});

export const redirectInputSchema = z.strictObject({
  fromPath: z
    .string()
    .regex(/^\/[^\s]*$/, 'Chemin interne commençant par /')
    .max(512),
  toPath: z
    .string()
    .regex(/^\/[^\s]*$/, 'Chemin interne commençant par /')
    .max(512),
  status: z.union([z.literal(301), z.literal(302), z.literal(308)]).default(301),
});
export const redirectSchema = z.object({
  id: z.string(),
  fromPath: z.string(),
  toPath: z.string(),
  status: z.number().int(),
});
export type Redirect = z.infer<typeof redirectSchema>;

// ——— Utilisateurs, modération, audit, stats ———

export const adminUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  role: roleSchema,
  emailVerified: z.boolean(),
  twoFactorEnabled: z.boolean(),
  disabledAt: z.string().nullable(),
  createdAt: z.string(),
});
export type AdminUser = z.infer<typeof adminUserSchema>;

export const roleInputSchema = z.strictObject({ role: roleSchema });
export const userStatusInputSchema = z.strictObject({ disabled: z.boolean() });

export const reportSchema = z.object({
  id: z.string(),
  targetType: z.string(),
  targetId: z.string(),
  reason: z.string(),
  details: z.string().nullable(),
  state: z.enum(['OPEN', 'RESOLVED', 'REJECTED']),
  createdAt: z.string(),
});
export type Report = z.infer<typeof reportSchema>;
export const reportUpdateInputSchema = z.strictObject({
  state: z.enum(['RESOLVED', 'REJECTED']),
  action: z.enum(['NONE', 'HIDE_CONTENT']).default('NONE'),
});
/** File de modération : signalements ouverts par défaut. */
export const reportListQuerySchema = z.strictObject({
  state: z.enum(['OPEN', 'RESOLVED', 'REJECTED']).default('OPEN'),
  limit: z.coerce.number().int().min(1).max(50).default(25),
  cursor: z.string().max(512).optional(),
});
export type ReportListQuery = z.infer<typeof reportListQuerySchema>;

export const auditEntrySchema = z.object({
  id: z.string(),
  actor: z.string().nullable(),
  action: z.string(),
  entity: z.string(),
  entityId: z.string().nullable(),
  createdAt: z.string(),
});
export type AuditEntry = z.infer<typeof auditEntrySchema>;

export const statsQuerySchema = z.strictObject({
  days: z.coerce
    .number()
    .int()
    .refine((d) => [7, 30, 90].includes(d))
    .default(30),
});
export const statsOverviewSchema = z.object({
  days: z.number().int(),
  visits: z.number().int(),
  playStarts: z.number().int(),
  playCompletes: z.number().int(),
  members: z.number().int(),
  daily: z.array(
    z.object({ date: z.string(), visits: z.number().int(), playStarts: z.number().int() }),
  ),
  topFilms: z.array(z.object({ id: z.string(), title: z.string(), plays: z.number().int() })),
  devices: z.array(z.object({ device: z.string(), count: z.number().int() })),
  referrers: z.array(z.object({ referrer: z.string(), count: z.number().int() })),
});
export type StatsOverview = z.infer<typeof statsOverviewSchema>;

export const contactMessageSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  subject: z.string(),
  body: z.string(),
  handledAt: z.string().nullable(),
  createdAt: z.string(),
});
export type ContactMessage = z.infer<typeof contactMessageSchema>;

// ——— Médias ———

export const imageUploadResultSchema = imageSchema.extend({ id: z.string() });
export type ImageUploadResult = z.infer<typeof imageUploadResultSchema>;

export const imageAltInputSchema = z.strictObject({
  alt: z.string().trim().max(300),
  decorative: z.boolean().default(false),
});

/**
 * Cadrage d'une image : point focal et recadrages par format (rectangles en fractions). L'image
 * d'origine n'est jamais réécrite ; un format sans recadrage se déduit du point focal.
 */
export const imageFramingInputSchema = z.strictObject({
  focal: focalPointSchema.nullable(),
  crops: imageCropsSchema,
});
export type ImageFramingInput = z.infer<typeof imageFramingInputSchema>;

export const videoUploadInitSchema = z.strictObject({
  filmId: idSchema,
  fileName: z.string().trim().min(1).max(255),
  bytes: z
    .number()
    .int()
    .positive()
    .max(20 * 1024 ** 3),
  mime: z.enum(['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm']),
});
export const videoUploadSchema = z.object({
  uploadId: z.string(),
  chunkSize: z.number().int(),
  receivedBytes: z.number().int(),
  bytes: z.number().int(),
});
export type VideoUpload = z.infer<typeof videoUploadSchema>;
export const videoStatusSchema = z.object({
  id: z.string(),
  state: z.enum(['PENDING', 'PROCESSING', 'READY', 'FAILED']),
  progress: z.number().min(0).max(100).nullable(),
  error: z.string().nullable(),
});
export type VideoStatus = z.infer<typeof videoStatusSchema>;

/**
 * Envoi d'image : octets bruts dans le corps (Content-Type image/jpeg|png|webp|avif), au plus
 * IMAGE_UPLOAD_MAX_BYTES. Le format réel est vérifié côté serveur puis ré-encodé en WebP.
 */
export const IMAGE_UPLOAD_MAX_BYTES = 8 * 1024 * 1024;
export const IMAGE_UPLOAD_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;
export const imageUploadQuerySchema = z.strictObject({
  alt: z.string().trim().max(300).optional(),
  decorative: z.enum(['true', 'false']).default('false'),
});
export type ImageUploadQuery = z.infer<typeof imageUploadQuerySchema>;

/** En-tête d'un morceau d'envoi vidéo : position (en octets) du premier octet envoyé. */
export const UPLOAD_OFFSET_HEADER = 'upload-offset';

// ——— Accueil (programmation, lot 3) ———

export const HOME_FEATURED_MAX = 5;
export const HOME_EDITORIAL_ROWS_MAX = 8;
export const HOME_ROW_FILMS_MAX = 20;
export const HOME_TALENTS_MIN = 6;
export const HOME_TALENTS_MAX = 12;

const uniqueIds = (ids: string[]) => new Set(ids).size === ids.length;
const endsAfterStart = (value: { startsAt: string | null; endsAt: string | null }) =>
  !value.startsAt || !value.endsAt || new Date(value.endsAt) > new Date(value.startsAt);

/** Emplacement de l'affiche à la une : film, période (heure de Kinshasa à la saisie), aperçu vidéo. */
export const featuredSlotInputSchema = z
  .strictObject({
    filmId: idSchema,
    startsAt: isoDateSchema,
    endsAt: isoDateSchema.nullable(),
    previewVideo: z.boolean(),
  })
  .refine(endsAfterStart, { message: 'La fin doit suivre le début.', path: ['endsAt'] });

/** Rangée éditoriale nommée (« Spécial 30 juin ») : titres ordonnés, programmation facultative. */
export const homeRowInputSchema = z
  .strictObject({
    id: idSchema.optional(),
    title: z.string().trim().min(2, 'Au moins 2 caractères').max(60, '60 caractères au plus'),
    startsAt: isoDateSchema.nullable(),
    endsAt: isoDateSchema.nullable(),
    filmIds: z
      .array(idSchema)
      .min(1, 'Choisissez au moins un titre.')
      .max(HOME_ROW_FILMS_MAX, `${HOME_ROW_FILMS_MAX} titres au plus.`)
      .refine(uniqueIds, 'Un titre figure deux fois.'),
  })
  .refine(endsAfterStart, { message: 'La fin doit suivre le début.', path: ['endsAt'] });

/** Programmation complète de l'accueil, enregistrée d'un seul geste (un seul bouton principal). */
export const homeInputSchema = z.strictObject({
  featured: z
    .array(featuredSlotInputSchema)
    .max(HOME_FEATURED_MAX, `${HOME_FEATURED_MAX} emplacements au plus.`),
  rows: z
    .array(homeRowInputSchema)
    .max(HOME_EDITORIAL_ROWS_MAX, `${HOME_EDITORIAL_ROWS_MAX} rangées éditoriales au plus.`),
  talentIds: z
    .array(idSchema)
    .max(HOME_TALENTS_MAX, `${HOME_TALENTS_MAX} talents au plus.`)
    .refine(uniqueIds, 'Un talent figure deux fois.')
    .refine(
      (ids) => ids.length === 0 || ids.length >= HOME_TALENTS_MIN,
      `Choisissez au moins ${HOME_TALENTS_MIN} talents, ou aucun.`,
    ),
});
export type HomeInput = z.infer<typeof homeInputSchema>;

/** Élément choisi (film ou talent) tel que l'administration l'affiche. */
export const adminPickSchema = z.object({
  id: z.string(),
  title: z.string(),
  meta: z.string().nullable(),
});
export type AdminPick = z.infer<typeof adminPickSchema>;

export const adminHomeSchema = z.object({
  featured: z.array(
    z.object({
      film: adminPickSchema,
      startsAt: z.string(),
      endsAt: z.string().nullable(),
      previewVideo: z.boolean(),
    }),
  ),
  rows: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      startsAt: z.string().nullable(),
      endsAt: z.string().nullable(),
      films: z.array(adminPickSchema),
    }),
  ),
  talents: z.array(adminPickSchema),
  /** Dernier Top 10 calculé (lecture seule), ou `null` tant qu'aucun calcul n'a eu lieu. */
  top10: z
    .object({
      day: z.string(),
      entries: z.array(
        z.object({ rank: z.number().int(), title: z.string(), viewers: z.number().int() }),
      ),
    })
    .nullable(),
});
export type AdminHome = z.infer<typeof adminHomeSchema>;
