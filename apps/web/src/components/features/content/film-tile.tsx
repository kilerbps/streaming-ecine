import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import type { FilmSummary, Locale } from '@ecine/contracts';
import { filmMeta } from '@/lib/format';
import { routes } from '@/lib/routes';
import { Poster } from './poster';

/** Tuile film : affiche 2:3, titre en serif, métadonnées en mono. Toute la tuile est un lien. */
export async function FilmTile({
  film,
  locale,
  sizes = '(min-width: 1056px) 20vw, (min-width: 672px) 30vw, 46vw',
  eager = false,
}: {
  film: FilmSummary;
  locale: Locale;
  sizes?: string;
  /** Première rangée visible : chargement prioritaire (LCP). */
  eager?: boolean;
}) {
  const t = await getTranslations('kinds');
  return (
    <Link
      href={routes.film(locale, film.slug)}
      className="group block focus-visible:outline-offset-4"
    >
      <Poster
        image={film.poster}
        sizes={sizes}
        preload={eager}
        className="border border-transparent group-hover:border-border-strong"
      />
      <p className="eyebrow mt-3 text-signal-text">{t(film.kind)}</p>
      <h3 className="mt-1 font-serif text-lg leading-tight underline-offset-4 group-hover:underline">
        {film.title}
      </h3>
      <p className="meta mt-1">{filmMeta(film.year, film.runtimeSec)}</p>
    </Link>
  );
}

/** Grille éditoriale de tuiles (2 colonnes mobile, 3 tablette, 4–5 PC). */
export function TileGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4 xl:grid-cols-5">
      {children}
    </div>
  );
}
