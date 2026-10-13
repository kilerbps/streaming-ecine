import { getTranslations } from 'next-intl/server';
import type { ContinueWatchingItem, Locale } from '@ecine/contracts';
import { Row } from '@/components/ui/row';
import { LandscapeTile } from '@/components/ui/tiles';
import { routes } from '@/lib/routes';

/**
 * Rangée « Reprendre » (effet Zeigarnik) : tuiles paysage 16:9, barre rouge et temps restant ;
 * la reprise est à un geste.
 */
export async function ContinueWatching({
  items,
  locale,
}: {
  items: ContinueWatchingItem[];
  locale: Locale;
}) {
  if (items.length === 0) return null;
  const t = await getTranslations('tiles');
  return (
    <Row id="reprendre" title={t('continueWatching')}>
      {items.map(({ film, positionSec }) => {
        const runtime = film.runtimeSec ?? 0;
        const remaining = runtime > positionSec ? Math.ceil((runtime - positionSec) / 60) : null;
        return (
          <LandscapeTile
            key={film.id}
            href={`${routes.film(locale, film.slug)}?reprendre=1`}
            title={film.title}
            image={film.poster}
            meta={remaining !== null ? t('remaining', { minutes: remaining }) : undefined}
            progress={runtime > 0 ? positionSec / runtime : undefined}
          />
        );
      })}
    </Row>
  );
}
