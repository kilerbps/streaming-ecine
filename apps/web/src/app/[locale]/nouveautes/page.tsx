import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@ecine/contracts';
import { ArticleCard } from '@/components/features/content/article-card';
import { EventCard, UpcomingCard } from '@/components/features/whats-new/whats-new-cards';
import { WHATS_NEW_SEGMENTS, type WhatsNewSegment } from '@/components/features/whats-new/segments';
import { WhatsNewTabs } from '@/components/features/whats-new/whats-new-tabs';
import { LargeTitle } from '@/components/layout/header-title';
import { EmptyState } from '@/components/ui/empty-state';
import { LinkButton } from '@/components/ui/link-button';
import { routes } from '@/lib/routes';
import { getArticles, getReminders, getWhatsNew } from '@/server/data';
import { pageMetadata } from '@/server/seo';

type Props = PageProps<'/[locale]/nouveautes'>;

/** Actualités montrées dans Nouveautés : la une et les plus récentes ; la suite est sous /actualites. */
const NEWS_COUNT = 7;

const CARD_GRID = 'grid gap-8 md:grid-cols-2 md:gap-x-6 lg:grid-cols-3';

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations('whatsNew');
  return pageMetadata({
    locale: locale as Locale,
    path: '/nouveautes',
    title: t('title'),
    description: t('intro'),
    noIndex: Boolean(sp.vue),
  });
}

/**
 * Nouveautés (docs/design/04, Nouveautés) : films annoncés avec rappel, événements à venir avec
 * fichier de calendrier, actualités. Pas de bouton principal : chaque carte n'a que des actions
 * secondaires.
 */
export default async function WhatsNewPage({ params, searchParams }: Props) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const vue = (await searchParams).vue;
  const [t, tn, whatsNew, news, reminders] = await Promise.all([
    getTranslations('whatsNew'),
    getTranslations('news'),
    getWhatsNew(),
    getArticles({ limit: NEWS_COUNT }).catch(() => null),
    getReminders().catch(() => []),
  ]);
  const reminded = new Set(reminders.map((film) => film.id));
  const fallback: WhatsNewSegment =
    whatsNew.films.length > 0
      ? 'bientot'
      : whatsNew.events.length > 0
        ? 'evenements'
        : 'actualites';
  const initial = WHATS_NEW_SEGMENTS.find((segment) => segment === vue) ?? fallback;
  const [lead, ...rest] = news?.items ?? [];

  return (
    <div className="container-page pt-6 md:pt-10">
      <header className="mb-5 flex flex-col gap-2 md:mb-6">
        <LargeTitle>{t('title')}</LargeTitle>
        <p className="max-w-[60ch] text-[15px] leading-5 text-muted md:text-base md:leading-6">
          {t('intro')}
        </p>
      </header>
      <WhatsNewTabs
        initial={initial}
        label={t('segments')}
        labels={{ bientot: t('soon'), evenements: t('events'), actualites: t('news') }}
        panels={{
          bientot:
            whatsNew.films.length > 0 ? (
              <div className={CARD_GRID}>
                {whatsNew.films.map((film) => (
                  <UpcomingCard
                    key={film.id}
                    film={film}
                    locale={locale}
                    reminded={reminded.has(film.id)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState title={t('soonEmpty')} />
            ),
          evenements:
            whatsNew.events.length > 0 ? (
              <div className={CARD_GRID}>
                {whatsNew.events.map((event) => (
                  <EventCard key={event.id} event={event} locale={locale} />
                ))}
              </div>
            ) : (
              <EmptyState title={t('eventsEmpty')} />
            ),
          actualites: lead ? (
            <div className="flex flex-col gap-8">
              <ArticleCard article={lead} locale={locale} variant="lead" />
              {rest.length > 0 ? (
                <ul className="flex flex-col gap-5 md:grid md:grid-cols-2 md:gap-x-6 md:gap-y-8 lg:grid-cols-3">
                  {rest.map((article) => (
                    <li key={article.id}>
                      <ArticleCard article={article} locale={locale} />
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="flex justify-center">
                <LinkButton
                  transitionTypes={['push']}
                  href={routes.news(locale)}
                  variant="secondary"
                >
                  {t('allNews')}
                </LinkButton>
              </div>
            </div>
          ) : (
            <EmptyState title={tn('empty')} />
          ),
        }}
      />
    </div>
  );
}
