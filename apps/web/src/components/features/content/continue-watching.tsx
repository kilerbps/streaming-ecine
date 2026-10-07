import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { ContinueWatchingItem, Locale } from '@ecine/contracts';
import { formatTimecode } from '@/lib/format';
import { routes } from '@/lib/routes';
import { Poster } from './poster';

/** « Reprendre » (effet Zeigarnik) : progression visible, reprise en un geste. */
export async function ContinueWatching({
  items,
  locale,
}: {
  items: ContinueWatchingItem[];
  locale: Locale;
}) {
  if (items.length === 0) return null;
  const t = await getTranslations('feed');
  return (
    <section aria-labelledby="reprendre" className="mb-10">
      <h2 id="reprendre" className="eyebrow mb-4 text-muted">
        {t('continueWatching')}
      </h2>
      <ul className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        {items.map(({ film, positionSec }) => {
          const progress = film.runtimeSec
            ? Math.min(100, Math.round((positionSec / film.runtimeSec) * 100))
            : null;
          return (
            <li key={film.id} className="w-36 shrink-0 md:w-44">
              <Link href={`${routes.film(locale, film.slug)}?reprendre=1`} className="group block">
                <Poster image={film.poster} sizes="176px" />
                {progress !== null ? (
                  <div
                    className="h-1 w-full bg-surface-2"
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={film.title}
                  >
                    <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
                  </div>
                ) : null}
                <p className="mt-2 line-clamp-1 font-serif group-hover:underline">{film.title}</p>
                <p className="meta">{formatTimecode(positionSec)}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
