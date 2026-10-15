import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import type { FilmSummary, Locale } from '@ecine/contracts';
import { Badge } from '@/components/ui/badge';
import { POSTER_SIZES, PosterTile } from '@/components/ui/tiles';
import { filmBadges, type FilmBadge } from '@/lib/film-badges';
import { routes } from '@/lib/routes';

/** Largeur d'une affiche dans la grille (3 colonnes mobile, 4 tablette, 6 puis 7 sur PC). */
export const GRID_SIZES =
  '(min-width: 1312px) 15vw, (min-width: 1056px) 17vw, (min-width: 672px) 24vw, 32vw';

const BADGE_TONES = { soon: 'accent', new: 'signal', short: 'neutral' } as const;

/**
 * Tuile film v2 (charte, Tuile affiche) : affiche 2:3, titre sur 2 lignes dessous, badges en haut à
 * gauche. Toute la tuile est le lien. En rangée, largeur fixe (`.tile-size`) ; en grille, pleine
 * largeur de la colonne.
 */
export async function FilmTile({
  film,
  locale,
  layout = 'grid',
  eager = false,
  preview = false,
}: {
  film: FilmSummary;
  locale: Locale;
  layout?: 'grid' | 'row';
  /** Toucher ouvre l'aperçu rapide (rangées de l'accueil) au lieu de la fiche. */
  preview?: boolean;
  /** Première rangée visible : chargement prioritaire (LCP). */
  eager?: boolean;
}) {
  const t = await getTranslations('tiles');
  const badges = filmBadges(film, new Date());
  return (
    <PosterTile
      href={preview ? routes.filmPreview(locale, film.slug) : routes.film(locale, film.slug)}
      title={film.title}
      image={film.poster}
      preload={eager}
      sizes={layout === 'grid' ? GRID_SIZES : POSTER_SIZES}
      width={layout === 'grid' ? 'w-full' : undefined}
      badge={
        badges.length > 0
          ? badges.map((badge: FilmBadge) => (
              <Badge key={badge} tone={BADGE_TONES[badge]}>
                {t(badge)}
              </Badge>
            ))
          : undefined
      }
    />
  );
}

/** Grille de tuiles des catalogues : 3 colonnes mobile, 4 tablette, 6 puis 7 sur PC. */
export function TileGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-x-2 gap-y-5 md:grid-cols-4 md:gap-x-3 lg:grid-cols-6 lg:gap-x-4 lg:gap-y-7 xl:grid-cols-7">
      {children}
    </div>
  );
}
