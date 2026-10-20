import { z } from 'zod';

// Messages de validation par défaut en français (les messages explicites des schémas priment).
z.config(z.locales.fr());

/** Langues disponibles. Ajouter une langue = l'ajouter ici + fichier de messages (docs/skills/ecine-seo-i18n.md). */
export const LOCALES = ['fr'] as const;
export const DEFAULT_LOCALE = 'fr' satisfies (typeof LOCALES)[number];
export const localeSchema = z.enum(LOCALES);
export type Locale = z.infer<typeof localeSchema>;

export const idSchema = z.string().min(1).max(64);
export const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lettres minuscules, chiffres et tirets uniquement');

export const isoDateSchema = z.iso.datetime({ offset: true });

/** Pagination par curseur opaque (docs/04-API-SPEC.md §1). */
export const MAX_PAGE_SIZE = 50;
export const cursorQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(20),
  cursor: z.string().max(512).optional(),
});
export type CursorQuery = z.infer<typeof cursorQuerySchema>;

export function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({ items: z.array(item), nextCursor: z.string().nullable() });
}
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/** Erreur au format RFC 9457 (application/problem+json). */
/**
 * Motif d'un refus 429 (ADR-0015), lu par le site pour réagir sans impasse :
 * - `identity` : limite du compte ou de l'appareil, attendre `retryAfter` ;
 * - `pot_ip` : réserve des appareils neufs de l'IP épuisée, vérifier l'appareil (Turnstile) ;
 * - `verify` : IP d'hébergeur, vérification de l'appareil exigée ;
 * - `ip` : plafond de l'adresse IP, attendre ;
 * - `concurrent` : trop de lectures en même temps sur ce compte ou cet appareil ;
 * - `session` : quota d'une session de lecture (renouvellements, clés).
 */
export const RATE_LIMIT_REASONS = [
  'identity',
  'pot_ip',
  'verify',
  'ip',
  'concurrent',
  'session',
] as const;
export type RateLimitReason = (typeof RATE_LIMIT_REASONS)[number];

export const problemSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  errors: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  /** 429 : motif du refus et attente conseillée, en secondes (aussi dans `Retry-After`). */
  reason: z.enum(RATE_LIMIT_REASONS).optional(),
  retryAfter: z.number().int().nonnegative().optional(),
});
export type Problem = z.infer<typeof problemSchema>;

export const roleSchema = z.enum([
  'SUPER_ADMIN',
  'ADMIN',
  'EDITOR',
  'MODERATOR',
  'CREATOR',
  'MEMBER',
]);
export type Role = z.infer<typeof roleSchema>;

/** Hiérarchie des rôles d'administration : un rôle hérite des droits des rôles situés après lui. */
export const ROLE_RANK: Record<Role, number> = {
  SUPER_ADMIN: 50,
  ADMIN: 40,
  EDITOR: 30,
  MODERATOR: 20,
  CREATOR: 10,
  MEMBER: 0,
};
export function hasRole(actual: Role, minimum: Role): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[minimum];
}

export const publishStateSchema = z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']);
export type PublishState = z.infer<typeof publishStateSchema>;

/**
 * Image publique déjà compressée. `src` est une base : le chargeur d'images ajoute `/w{largeur}.webp`.
 * Largeurs disponibles : IMAGE_WIDTHS.
 */
export const IMAGE_WIDTHS = [320, 640, 960, 1280, 1920] as const;
/**
 * Formats d'image de la refonte (docs/design/05-admin.md, Images et vidéos) : affiche 2:3, fiche mobile
 * et portrait 4:5, couverture et PC 16:9, crédits 1:1, Découvrir 9:16.
 */
export const IMAGE_RATIOS = ['2:3', '4:5', '16:9', '1:1', '9:16'] as const;
export type ImageRatio = (typeof IMAGE_RATIOS)[number];

const fraction = z.number().min(0).max(1);

/** Recadrage, en fractions de l'image d'origine (jamais réécrite). */
export const cropRectSchema = z.strictObject({
  x: fraction,
  y: fraction,
  w: fraction.positive(),
  h: fraction.positive(),
});
export type CropRect = z.infer<typeof cropRectSchema>;

export const imageCropsSchema = z.partialRecord(z.enum(IMAGE_RATIOS), cropRectSchema);
export type ImageCrops = z.infer<typeof imageCropsSchema>;

/** Point focal (visage, sujet principal), en fractions de l'image. */
export const focalPointSchema = z.strictObject({ x: fraction, y: fraction });
export type FocalPoint = z.infer<typeof focalPointSchema>;

/** Aperçu flou : WebP de 16 px en data URL (moins de 500 octets, un peu de marge pour l'en-tête). */
export const BLUR_DATA_URL_PREFIX = 'data:image/webp;base64,';

export const imageSchema = z.object({
  src: z.string(),
  alt: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  /** Couleur dominante (#rrggbb), affichée avant l'image. */
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .nullable()
    .optional(),
  blur: z.string().startsWith(BLUR_DATA_URL_PREFIX).max(1024).nullable().optional(),
  focal: focalPointSchema.nullable().optional(),
  crops: imageCropsSchema.nullable().optional(),
});
export type Image = z.infer<typeof imageSchema>;

export const socialsSchema = z
  .strictObject({
    instagram: z.url().optional(),
    facebook: z.url().optional(),
    x: z.url().optional(),
    youtube: z.url().optional(),
    tiktok: z.url().optional(),
    linkedin: z.url().optional(),
    website: z.url().optional(),
  })
  .partial();
export type Socials = z.infer<typeof socialsSchema>;
