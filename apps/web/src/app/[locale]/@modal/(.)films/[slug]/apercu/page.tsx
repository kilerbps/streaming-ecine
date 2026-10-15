import type { Locale } from '@ecine/contracts';
import { FilmPreview } from '@/components/features/content/film-preview';
import { PreviewSheet } from '@/components/features/content/film-preview-client';
import { getFilm, getFilms, getFilmViewerState } from '@/server/data';

/** « Vous aimerez aussi » dans l'aperçu : même catégorie, 10 titres. */
const RELATED_COUNT = 10;

/**
 * Aperçu rapide ouvert depuis une rangée (route interceptée) : la feuille s'ouvre au-dessus de
 * l'écran d'origine. Une visite directe de la même adresse affiche la fiche complète.
 */
export default async function FilmPreviewModal({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const locale = raw as Locale;
  const film = await getFilm(slug).catch(() => null);
  if (!film) return null;
  const [state, related] = await Promise.all([
    getFilmViewerState(film.id).catch(() => null),
    film.categories[0]
      ? getFilms({ category: film.categories[0].slug, limit: RELATED_COUNT + 1 }).catch(() => null)
      : Promise.resolve(null),
  ]);
  return (
    <PreviewSheet title={film.title}>
      <FilmPreview
        film={film}
        state={state}
        related={(related?.items ?? []).filter((f) => f.id !== film.id).slice(0, RELATED_COUNT)}
        locale={locale}
      />
    </PreviewSheet>
  );
}
