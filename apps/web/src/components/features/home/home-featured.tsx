import { getTranslations } from 'next-intl/server';
import type { HomeFeatured as HomeFeaturedItem, Locale } from '@ecine/contracts';
import { BookmarkButton } from '@/components/features/interactions/bookmark-button';
import { AutoPreview } from '@/components/features/player/auto-preview';
import { Featured } from '@/components/ui/featured';
import { LinkButton } from '@/components/ui/link-button';
import { formatRuntime } from '@/lib/format';
import { routes } from '@/lib/routes';
import { getFilmViewerState } from '@/server/data';

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/**
 * Affiche à la une de l'accueil : catégorie, langue et durée ; « Regarder » (principal, lance la
 * lecture sur la fiche) et « Ma liste » (secondaire). Film non lisible : « Voir la fiche ».
 */
export async function HomeFeatured({
  items,
  locale,
}: {
  items: HomeFeaturedItem[];
  locale: Locale;
}) {
  if (items.length === 0) return null;
  const [t, tl, states] = await Promise.all([
    getTranslations('home'),
    getTranslations('languages'),
    Promise.all(items.map((item) => getFilmViewerState(item.film.id).catch(() => null))),
  ]);
  return (
    <Featured
      labels={{
        region: t('featured.region'),
        carousel: t('featured.carousel'),
        slide: t('featured.slide'),
        show: t.raw('featured.show') as string,
      }}
      items={items.map((item, index) => {
        const { film } = item;
        const href = routes.film(locale, film.slug);
        const language = item.audioLanguages[0];
        return {
          key: film.id,
          title: film.title,
          titleImage: item.titleImage,
          image: film.poster,
          preview: item.previewVideoId ? <AutoPreview videoId={item.previewVideoId} /> : null,
          meta: [
            film.categories[0]?.name,
            language ? capitalize(tl(language)) : null,
            formatRuntime(film.runtimeSec),
          ].filter((value): value is string => Boolean(value)),
          actions: (
            <>
              <LinkButton
                transitionTypes={['push']}
                href={item.playable ? `${href}?reprendre=1` : href}
                variant="primary"
                size="lg"
                icon={item.playable ? 'play' : undefined}
                // Une seule diapositive visible à la fois : un seul bouton principal par vue.
                data-cta={index === 0 ? 'primary' : 'carousel'}
              >
                {item.playable ? t('watch') : t('seeFilm')}
              </LinkButton>
              <BookmarkButton
                filmId={film.id}
                initial={states[index]?.bookmarked ?? false}
                variant="on-image"
              />
            </>
          ),
        };
      })}
    />
  );
}
