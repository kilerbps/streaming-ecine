import type { PublishCheck } from '@ecine/contracts';
import { PROBLEM_TYPES, ProblemException } from '../common/problem.js';

/**
 * Contrôles qualité avant publication (docs/03-DATA-MODEL.md §4, docs/skills/ecine-admin-backoffice.md).
 * Fonctions pures : les faits sont chargés par les services, la décision est prise ici (testée unitairement).
 */

/** Élément manquant : champ concerné (pour l'interface) + message lisible en français. */
export interface PublishIssue {
  field: string;
  message: string;
}

/** Image telle que vue par les contrôles (null si absente, pas une image ou pas encore traitée). */
export interface ImageFacts {
  alt: string | null;
  decorative: boolean;
}

const filled = (value: string | null | undefined): boolean => Boolean(value?.trim());

/** Faits d'un média lié : un fichier qui n'est pas une image ne satisfait jamais l'exigence de texte alternatif. */
export function imageFacts(
  media: { kind: string; alt: string | null; decorative: boolean } | null,
): ImageFacts | null {
  if (!media) return null;
  return media.kind === 'IMAGE'
    ? { alt: media.alt, decorative: media.decorative }
    : { alt: null, decorative: false };
}

/** Une image publiée a un texte alternatif, sauf image décorative explicitement marquée. */
export function hasAccessibleAlt(image: ImageFacts): boolean {
  return image.decorative || filled(image.alt);
}

export interface FilmPublishFacts {
  /** Traduction française (obligatoire). */
  title: string | null | undefined;
  synopsis: string | null | undefined;
  poster: ImageFacts | null;
  rightsOk: boolean;
  readyVideos: number;
  trailerUrl: string | null;
  seoTitle: string | null | undefined;
  /** Vrai si le titre SEO est déjà utilisé par un autre film (non supprimé). */
  seoTitleTaken: boolean;
}

export function filmPublishIssues(film: FilmPublishFacts): PublishIssue[] {
  const issues: PublishIssue[] = [];
  if (!filled(film.title))
    issues.push({ field: 'title', message: 'Ajoutez le titre en français.' });
  if (!filled(film.synopsis))
    issues.push({ field: 'synopsis', message: 'Ajoutez le résumé en français.' });
  if (!film.poster) {
    issues.push({ field: 'posterId', message: 'Ajoutez une affiche.' });
  } else if (film.poster.decorative || !filled(film.poster.alt)) {
    // L'affiche porte de l'information : elle ne peut pas être décorative.
    issues.push({ field: 'posterId', message: 'Décrivez l’affiche (texte alternatif).' });
  }
  if (film.rightsOk !== true)
    issues.push({ field: 'rightsOk', message: 'Confirmez les droits de diffusion.' });
  if (film.readyVideos < 1 && !filled(film.trailerUrl)) {
    issues.push({
      field: 'videos',
      message: 'Ajoutez une vidéo prête (transcodage terminé) ou une bande-annonce.',
    });
  }
  if (filled(film.seoTitle) && film.seoTitleTaken) {
    issues.push({ field: 'seoTitle', message: 'Ce titre SEO est déjà utilisé par un autre film.' });
  }
  return issues;
}

export interface PersonPublishFacts {
  name: string | null | undefined;
  photo: ImageFacts | null;
}

export function personPublishIssues(person: PersonPublishFacts): PublishIssue[] {
  const issues: PublishIssue[] = [];
  if (!filled(person.name)) issues.push({ field: 'name', message: 'Ajoutez le nom en français.' });
  if (person.photo && !hasAccessibleAlt(person.photo)) {
    issues.push({
      field: 'photoId',
      message: 'Décrivez la photo (texte alternatif) ou marquez-la comme décorative.',
    });
  }
  return issues;
}

export interface ArticlePublishFacts {
  title: string | null | undefined;
  excerpt: string | null | undefined;
  body: string | null | undefined;
  cover: ImageFacts | null;
}

export function articlePublishIssues(article: ArticlePublishFacts): PublishIssue[] {
  const issues: PublishIssue[] = [];
  if (!filled(article.title))
    issues.push({ field: 'title', message: 'Ajoutez le titre en français.' });
  if (!filled(article.excerpt))
    issues.push({ field: 'excerpt', message: 'Ajoutez le chapeau en français.' });
  if (!filled(article.body))
    issues.push({ field: 'body', message: 'Ajoutez le texte en français.' });
  if (article.cover && !hasAccessibleAlt(article.cover)) {
    issues.push({
      field: 'coverId',
      message: 'Décrivez l’image de couverture (texte alternatif) ou marquez-la comme décorative.',
    });
  }
  return issues;
}

export interface PostPublishFacts {
  caption: string | null | undefined;
  /** Images dans l'ordre ; null = média introuvable ou qui n'est pas une image. */
  images: Array<ImageFacts | null>;
}

export function postPublishIssues(post: PostPublishFacts): PublishIssue[] {
  const issues: PublishIssue[] = [];
  if (!filled(post.caption)) issues.push({ field: 'caption', message: 'Ajoutez une légende.' });
  if (post.images.length === 0)
    issues.push({ field: 'imageIds', message: 'Ajoutez au moins une image.' });
  post.images.forEach((image, index) => {
    if (!image) {
      issues.push({
        field: `imageIds.${index}`,
        message: `L’image n° ${index + 1} est introuvable.`,
      });
    } else if (!hasAccessibleAlt(image)) {
      issues.push({
        field: `imageIds.${index}`,
        message: `Décrivez l’image n° ${index + 1} (texte alternatif) ou marquez-la comme décorative.`,
      });
    }
  });
  return issues;
}

export interface PagePublishFacts {
  title: string | null | undefined;
  body: string | null | undefined;
}

export function pagePublishIssues(page: PagePublishFacts): PublishIssue[] {
  const issues: PublishIssue[] = [];
  if (!filled(page.title))
    issues.push({ field: 'title', message: 'Ajoutez le titre en français.' });
  if (!filled(page.body)) issues.push({ field: 'body', message: 'Ajoutez le texte en français.' });
  return issues;
}

/** Réponse de `GET …/publish-check`. */
export function toPublishCheck(issues: PublishIssue[]): PublishCheck {
  return { ok: issues.length === 0, missing: issues.map((i) => i.message) };
}

/** Refuse la publication (422) avec la liste claire de ce qui manque. */
export function assertPublishable(issues: PublishIssue[]): void {
  if (issues.length === 0) return;
  throw new ProblemException({
    type: PROBLEM_TYPES.publishBlocked,
    title: 'Publication impossible',
    status: 422,
    detail: 'Complétez les éléments manquants avant de publier.',
    errors: issues.map((i) => ({ path: i.field, message: i.message })),
  });
}

/** Date de publication retenue : on garde une date passée (republication), sinon maintenant. */
export function publishAtOnPublish(current: Date | null, now: Date): Date {
  return current && current.getTime() <= now.getTime() ? current : now;
}
