import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Locale, UpcomingEvent, UpcomingFilm } from '@ecine/contracts';
import { ShareButton } from '@/components/features/interactions/share-button';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button-styles';
import { Icon } from '@/components/ui/icon';
import { MediaImage } from '@/components/ui/media-image';
import { dateBlock, formatTime } from '@/lib/format';
import { routes } from '@/lib/routes';
import { ReminderButton } from './reminder-button';

const CARD_SIZES = '(min-width: 1056px) 30vw, (min-width: 672px) 45vw, 100vw';

/** Bloc date : jour en Archivo, mois abrégé dessous (heure de Kinshasa). */
function DateBlock({ iso }: { iso: string }) {
  const { day, month } = dateBlock(iso);
  return (
    <time dateTime={iso} className="flex w-12 shrink-0 flex-col items-center pt-0.5">
      <span className="font-display text-[28px] font-extrabold leading-8">{day}</span>
      <span className="text-[13px] leading-[18px] text-muted">{month}</span>
    </time>
  );
}

/**
 * Film annoncé : image 16:9, bloc date, titre et badge Bientôt, genre et langue, synopsis sur deux
 * lignes ; « Me le rappeler » et Partager (actions secondaires : l'écran n'a pas de bouton principal).
 */
export async function UpcomingCard({
  film,
  locale,
  reminded,
}: {
  film: UpcomingFilm;
  locale: Locale;
  reminded: boolean;
}) {
  const [t, tl] = await Promise.all([getTranslations('tiles'), getTranslations('languages')]);
  const href = routes.film(locale, film.slug);
  const facts = [
    film.categories[0]?.name,
    film.audioLanguages[0] ? tl(film.audioLanguages[0]) : null,
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <article className="flex flex-col gap-3" aria-labelledby={`bientot-${film.id}`}>
      <Link
        transitionTypes={['push']}
        href={href}
        tabIndex={-1}
        aria-hidden="true"
        className="press block"
      >
        <MediaImage image={film.poster} ratio="16/9" sizes={CARD_SIZES} className="rounded-lg" />
      </Link>
      <div className="flex gap-3">
        <DateBlock iso={film.releaseAt} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <h3 id={`bientot-${film.id}`} className="text-[17px] font-semibold leading-[22px]">
              <Link
                transitionTypes={['push']}
                href={href}
                className="underline-offset-4 hover:underline"
              >
                {film.title}
              </Link>
            </h3>
            <Badge tone="accent">{t('soon')}</Badge>
          </div>
          {facts ? <p className="text-[13px] leading-[18px] text-muted">{facts}</p> : null}
          {film.synopsis ? (
            <p className="line-clamp-2 text-[15px] leading-5 text-muted">{film.synopsis}</p>
          ) : null}
          <div className="mt-2 flex items-center gap-2">
            <ReminderButton filmId={film.id} initial={reminded} />
            <ShareButton title={film.title} path={href} variant="icon" />
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * Événement à venir : bloc date, titre, heure de Kinshasa et lieu, film lié ; « Ajouter au
 * calendrier » (fichier .ics) et Partager.
 */
export async function EventCard({ event, locale }: { event: UpcomingEvent; locale: Locale }) {
  const t = await getTranslations('whatsNew');
  const href = routes.article(locale, event.slug);
  return (
    <article className="flex flex-col gap-3" aria-labelledby={`evenement-${event.id}`}>
      {event.cover ? (
        <Link
          transitionTypes={['push']}
          href={href}
          tabIndex={-1}
          aria-hidden="true"
          className="press block"
        >
          <MediaImage image={event.cover} ratio="16/9" sizes={CARD_SIZES} className="rounded-lg" />
        </Link>
      ) : null}
      <div className="flex gap-3">
        <DateBlock iso={event.eventStart} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 id={`evenement-${event.id}`} className="text-[17px] font-semibold leading-[22px]">
            <Link
              transitionTypes={['push']}
              href={href}
              className="underline-offset-4 hover:underline"
            >
              {event.title}
            </Link>
          </h3>
          <p className="flex items-start gap-1.5 text-[15px] leading-5 text-muted">
            <Icon name="clock" size={20} className="shrink-0" />
            <span>
              {formatTime(event.eventStart)}
              {event.eventPlace ? ` · ${event.eventPlace}` : ''}
            </span>
          </p>
          {event.featuredFilm ? (
            <p className="flex items-center gap-1.5 text-[15px] leading-5 text-muted">
              <Icon name="film" size={20} className="shrink-0" />
              <Link
                transitionTypes={['push']}
                href={routes.film(locale, event.featuredFilm.slug)}
                className="text-text underline-offset-4 hover:underline"
              >
                {event.featuredFilm.title}
              </Link>
            </p>
          ) : null}
          <div className="mt-2 flex items-center gap-2">
            <a
              href={`${href}/calendrier.ics`}
              download
              className={buttonClasses('secondary', 'md')}
            >
              <Icon name="calendar" size={20} />
              {t('addToCalendar')}
            </a>
            <ShareButton title={event.title} path={href} variant="icon" />
          </div>
        </div>
      </div>
    </article>
  );
}
