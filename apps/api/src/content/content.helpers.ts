import { Inject, Injectable } from '@nestjs/common';
import { DEFAULT_LOCALE, type Image } from '@ecine/contracts';
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

/** Langues à charger pour une requête (demandée + repli). */
export function localesFor(locale: string): string[] {
  return locale === DEFAULT_LOCALE ? [DEFAULT_LOCALE] : [locale, DEFAULT_LOCALE];
}

/** Construction des URLs publiques d'images (jamais la clé de stockage). */
@Injectable()
export class MediaUrls {
  constructor(@Inject(ENV) private readonly env: Env) {}

  image(
    media: Pick<Media, 'id' | 'alt' | 'width' | 'height' | 'decorative'> | null | undefined,
  ): Image | null {
    if (!media || !media.width || !media.height) return null;
    return {
      src: `${this.env.MEDIA_PUBLIC_URL}/images/${media.id}`,
      alt: media.decorative ? '' : (media.alt ?? ''),
      width: media.width,
      height: media.height,
    };
  }

  imageWithId(
    media: Pick<Media, 'id' | 'alt' | 'width' | 'height' | 'decorative'> | null | undefined,
  ): (Image & { id: string }) | null {
    const image = this.image(media);
    return image && media ? { ...image, id: media.id } : null;
  }
}

export function iso(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}
