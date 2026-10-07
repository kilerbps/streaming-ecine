import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@ecine/contracts';
import { Poster } from '@/components/features/content/poster';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { JsonLd } from '@/components/seo/json-ld';
import { Icon } from '@/components/ui/icon';
import { LinkButton } from '@/components/ui/link-button';
import { Tag } from '@/components/ui/tag';
import { filmMeta, formatDate, formatDateTime } from '@/lib/format';
import { Markdown } from '@/lib/markdown';
import { routes } from '@/lib/routes';
import { getArticle } from '@/server/data';
import { loadOrNotFound } from '@/server/not-found';
import { absoluteUrl, ogImage, pageMetadata } from '@/server/seo';

type Props = PageProps<'/[locale]/actualites/[slug]'>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = await loadOrNotFound(() => getArticle(slug), `/${locale}/actualites/${slug}`);
  return pageMetadata({
    locale: locale as Locale,
    path: `/actualites/${article.slug}`,
    title: article.seo.title ?? article.title,
    description: article.seo.description ?? article.excerpt,
    image: article.cover,
    type: 'article',
  });
}

export default async function ArticlePage({ params }: Props) {
  const { locale: raw, slug } = await params;
  const locale = raw as Locale;
  const article = await loadOrNotFound(() => getArticle(slug), `/${locale}/actualites/${slug}`);
  const [t, tk] = await Promise.all([getTranslations('news'), getTranslations('kinds')]);

  return (
    <article className="container-page pt-8 md:pt-12">
      <Breadcrumbs
        items={[
          { label: t('listTitle'), href: routes.news(locale) },
          { label: article.title, href: routes.article(locale, article.slug) },
        ]}
      />
      <header className="max-w-4xl">
        <div className="flex flex-wrap items-center gap-3">
          <Tag tone="highlight">{tk(article.kind)}</Tag>
          <time className="meta" dateTime={article.publishedAt}>
            {formatDate(article.publishedAt)}
          </time>
        </div>
        <h1 className="mt-4 font-serif text-4xl md:text-6xl">{article.title}</h1>
        <p className="mt-4 max-w-2xl font-serif text-xl italic text-muted">{article.excerpt}</p>
        <p className="meta mt-4">{t('by', { name: article.author.name })}</p>
        {article.eventStart ? (
          <p className="mt-4 inline-flex flex-wrap items-center gap-2 border border-border-strong px-4 py-3">
            <Icon name="calendar" size={18} />
            <span>{formatDateTime(article.eventStart)}</span>
            {article.eventPlace ? (
              <>
                <Icon name="location" size={18} />
                <span>{article.eventPlace}</span>
              </>
            ) : null}
          </p>
        ) : null}
      </header>
      {article.cover ? (
        <div className="mt-10 max-w-5xl">
          <Poster
            image={article.cover}
            ratio="16/9"
            sizes="(min-width: 1056px) 70vw, 100vw"
            preload
          />
        </div>
      ) : null}
      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="prose-ecine">
          <Markdown source={article.body} />
        </div>
        {article.featuredFilm ? (
          <aside className="self-start border border-border p-5 lg:sticky lg:top-8">
            <p className="eyebrow text-muted">{t('featuredFilm')}</p>
            <div className="mt-4 grid grid-cols-[96px_1fr] gap-4">
              <Poster image={article.featuredFilm.poster} sizes="96px" />
              <div>
                <p className="font-serif text-xl">{article.featuredFilm.title}</p>
                <p className="meta mt-1">
                  {tk(article.featuredFilm.kind)} ·{' '}
                  {filmMeta(article.featuredFilm.year, article.featuredFilm.runtimeSec)}
                </p>
              </div>
            </div>
            {/* L'action principale de l'actualité : regarder le film mis en avant (FR-031). */}
            <LinkButton
              href={routes.film(locale, article.featuredFilm.slug)}
              variant="primary"
              icon="play"
              className="mt-5 w-full"
            >
              {t('watchFilm')}
            </LinkButton>
          </aside>
        ) : null}
      </div>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': article.kind === 'EVENT' ? 'Event' : 'NewsArticle',
          ...(article.kind === 'EVENT'
            ? {
                name: article.title,
                startDate: article.eventStart ?? undefined,
                location: article.eventPlace
                  ? { '@type': 'Place', name: article.eventPlace }
                  : undefined,
                description: article.excerpt,
              }
            : {
                headline: article.title,
                datePublished: article.publishedAt,
                dateModified: article.updatedAt,
                author: { '@type': 'Person', name: article.author.name },
                publisher: { '@type': 'Organization', name: 'E-Ciné' },
              }),
          image: ogImage(article.cover),
          url: absoluteUrl(routes.article(locale, article.slug)),
        }}
      />
    </article>
  );
}
