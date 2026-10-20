import { Inject, Injectable } from '@nestjs/common';
import {
  DEFAULT_LOCALE,
  FILM_LANGUAGES,
  imageCropsSchema,
  type FilmLanguage,
  type Image,
} from '@ecine/contracts';
import { ENV, type Env } from '../config/env.js';
import type { Media } from '../generated/prisma/client.js';

/** Contenu visible du public : publié (ou planifié dont l'heure est passée), non supprimé. */
export function visibleWhere(now = new Date()) {
  return {
    deletedAt: null,
    state: { in: ['PUBLISHED' as const, 'SCHEDULED' as const] },
    publishAt: { lte: now },
  };
}

/**
 * Film lisible : visible et déjà sorti. Un film annoncé (« Bientôt », sortie future) a une page
 * publique mais aucune lecture avant sa sortie (ADR-0012).
 */
export function playableWhere(now = new Date()) {
  return {
    ...visibleWhere(now),
    OR: [{ releaseAt: null }, { releaseAt: { lte: now } }],
  };
}

/** Traduction demandée, sinon repli sur le français (langue obligatoire). */
export function pickTranslation<T extends { locale: string }>(
  translations: T[],
  locale: string,
): T | undefined {
  return (
    translations.find((t) => t.locale === locale) ??
    translations.find((t) => t.locale === DEFAULT_LOCALE)
  );
}

/** Langue de film connue (les codes inconnus d'anciennes saisies sont ignorés). */
export const isFilmLanguage = (code: string): code is FilmLanguage =>
  (FILM_LANGUAGES as readonly string[]).includes(code);

/** Langues à charger pour une requête (demandée + repli). */
export function localesFor(locale: string): string[] {
  return locale === DEFAULT_LOCALE ? [DEFAULT_LOCALE] : [locale, DEFAULT_LOCALE];
}

type ImageMedia = Pick<Media, 'id' | 'alt' | 'width' | 'height' | 'decorative'> &
  Partial<Pick<Media, 'dominantColor' | 'blurDataUrl' | 'focalX' | 'focalY' | 'crops'>>;

/** Construction des URLs publiques d'images (jamais la clé de stockage). */
@Injectable()
export class MediaUrls {
  constructor(@Inject(ENV) private readonly env: Env) {}

  /**
   * Image publique avec ce qui s'affiche avant elle (couleur dominante, aperçu flou) et son cadrage
   * (point focal, recadrages par ratio) ; ces champs manquent pour une image pas encore enrichie.
   */
  image(media: ImageMedia | null | undefined): Image | null {
    if (!media || !media.width || !media.height) return null;
    const crops = imageCropsSchema.safeParse(media.crops);
    return {
      src: `${this.env.MEDIA_PUBLIC_URL}/images/${media.id}`,
      alt: media.decorative ? '' : (media.alt ?? ''),
      width: media.width,
      height: media.height,
      color: media.dominantColor ?? null,
      blur: media.blurDataUrl ?? null,
      focal:
        media.focalX != null && media.focalY != null ? { x: media.focalX, y: media.focalY } : null,
      crops: media.crops != null && crops.success ? crops.data : null,
    };
  }

  /** Aperçu promotionnel statique (ADR-0015), public et mis en cache un an (nom versionné). */
  preview(file: string | null | undefined): string | null {
    return file ? `${this.env.MEDIA_PUBLIC_URL}/previews/${file}` : null;
  }

  imageWithId(media: ImageMedia | null | undefined): (Image & { id: string }) | null {
    const image = this.image(media);
    return image && media ? { ...image, id: media.id } : null;
  }
}

export function iso(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}
