import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Image as ImageData } from '@ecine/contracts';
import { MediaImage } from './media-image';
import { ProgressBar } from './progress-bar';

/** Tailles d'affiche en rangée (112 / 148 / 184 px, voir `.tile-size`). */
export const POSTER_SIZES = '(min-width: 1056px) 184px, (min-width: 672px) 148px, 112px';

/** Image de la tuile : couleur dominante, aperçu flou et cadrage viennent de l'image elle-même. */
interface TileImage {
  image: ImageData | null;
}

/**
 * Tuile affiche 2:3, rayon 8, sans bordure ni ombre. Toute la tuile est le lien ; titre sur 2 lignes
 * dessous (sauf si l'affiche porte déjà le titre). Badge en haut à gauche, progression en bas.
 */
export function PosterTile({
  href,
  title,
  ariaLabel,
  badge,
  progress,
  progressLabel,
  showTitle = true,
  meta,
  sizes = POSTER_SIZES,
  preload,
  width = 'w-[var(--tile-w)]',
  ...media
}: TileImage & {
  href: string;
  title: string;
  /** Ligne secondaire sous le titre (ex. rôle dans une filmographie). */
  meta?: string;
  /** Libellé complet pour les lecteurs d'écran (ex. rang du Top 10). */
  ariaLabel?: string;
  badge?: ReactNode;
  progress?: number;
  progressLabel?: string;
  showTitle?: boolean;
  sizes?: string;
  preload?: boolean;
  width?: string;
}) {
  return (
    <Link
      transitionTypes={['push']}
      href={href}
      aria-label={ariaLabel}
      className={`press group block shrink-0 snap-start ${width}`}
    >
      <div className="relative">
        <MediaImage
          {...media}
          ratio="2/3"
          sizes={sizes}
          preload={preload}
          className="rounded-sm"
          imageClassName="transition-transform duration-[var(--dur-base)] ease-[var(--ease-standard)] lg:group-hover:scale-[1.04]"
        />
        {badge ? <div className="absolute left-1.5 top-1.5 flex gap-1">{badge}</div> : null}
        {progress !== undefined ? (
          <ProgressBar
            value={progress}
            label={progressLabel ?? title}
            className="absolute inset-x-1.5 bottom-1.5 w-auto"
          />
        ) : null}
      </div>
      {showTitle ? (
        <p className="mt-2 line-clamp-2 text-[13px] leading-[18px] text-text">{title}</p>
      ) : null}
      {meta ? <p className="line-clamp-1 text-xs leading-4 text-subtle">{meta}</p> : null}
    </Link>
  );
}

/** Tuile paysage 16:9, rayon 12 : Reprendre (« 38 min restantes ») et courts-métrages. */
export function LandscapeTile({
  href,
  title,
  meta,
  progress,
  progressLabel,
  sizes = '(min-width: 1056px) 368px, (min-width: 672px) 296px, 224px',
  width = 'w-[calc(var(--tile-w)*2)]',
  ...media
}: TileImage & {
  href: string;
  title: string;
  meta?: string;
  progress?: number;
  progressLabel?: string;
  sizes?: string;
  width?: string;
}) {
  return (
    <Link
      transitionTypes={['push']}
      href={href}
      className={`press group block shrink-0 snap-start ${width}`}
    >
      <div className="relative">
        <MediaImage {...media} ratio="16/9" sizes={sizes} className="rounded-md" />
        {progress !== undefined ? (
          <ProgressBar
            value={progress}
            label={progressLabel ?? title}
            className="absolute inset-x-2 bottom-2 w-auto"
          />
        ) : null}
      </div>
      <p className="mt-2 line-clamp-1 text-[13px] leading-[18px] text-text">{title}</p>
      {meta ? <p className="text-xs font-semibold leading-4 text-muted">{meta}</p> : null}
    </Link>
  );
}

/**
 * Tuile du Top 10 : grand chiffre Archivo au contour `--text-muted`, affiche qui le chevauche de 16 px.
 * Le chiffre est décoratif : le rang est annoncé dans le libellé (« Numéro 3 du Top 10 : … »).
 */
export function Top10Tile({
  rank,
  href,
  title,
  ariaLabel,
  ...media
}: TileImage & { rank: number; href: string; title: string; ariaLabel: string }) {
  return (
    <Link
      transitionTypes={['push']}
      href={href}
      aria-label={ariaLabel}
      className="press group flex shrink-0 snap-start items-end"
    >
      <span
        aria-hidden="true"
        className="top10-rank -mr-4 select-none font-display text-[112px] font-extrabold leading-none lg:text-[160px]"
      >
        {rank}
      </span>
      <div className="relative w-[var(--tile-w)]">
        <MediaImage {...media} ratio="2/3" sizes={POSTER_SIZES} className="rounded-sm" />
        <span className="sr-only">{title}</span>
      </div>
    </Link>
  );
}

/** Portrait rond (72 px mobile, 96 px PC) : nom sur 2 lignes, rôle discret ; lien vers la fiche. */
export function Portrait({
  href,
  name,
  role,
  image,
}: {
  href: string;
  name: string;
  role?: string;
  image: ImageData | null;
}) {
  return (
    <Link
      transitionTypes={['push']}
      href={href}
      className="press group flex w-[88px] shrink-0 snap-start flex-col items-center text-center lg:w-[112px]"
    >
      <div className="w-[72px] lg:w-24">
        <MediaImage
          image={image}
          ratio="1/1"
          sizes="(min-width: 1056px) 96px, 72px"
          className="rounded-full"
        />
      </div>
      <p className="mt-2 line-clamp-2 text-[13px] leading-[18px] text-text">{name}</p>
      {role ? <p className="line-clamp-1 text-xs leading-4 text-subtle">{role}</p> : null}
    </Link>
  );
}
