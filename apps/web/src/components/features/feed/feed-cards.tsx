'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { FeedItem, Locale } from '@ecine/contracts';
import { LikeButton } from '@/components/features/interactions/like-button';
import { Poster } from '@/components/features/content/poster';
import { Icon } from '@/components/ui/icon';
import { Tag } from '@/components/ui/tag';
import { filmMeta, formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';

function Badges({ item }: { item: FeedItem }) {
  const t = useTranslations('feed');
  return (
    <>
      {item.pinned ? (
        <Tag tone="accent">
          <Icon name="pin" size={14} />
          {t('pinned')}
        </Tag>
      ) : null}
      {item.surprise ? (
        <Tag tone="highlight">
          <Icon name="surprise" size={14} />
          {t('surprise')}
        </Tag>
      ) : null}
    </>
  );
}

/** Film / court-métrage : grande image, titre serif, méta mono ; toute la carte mène au film. */
export function FilmCard({
  item,
  locale,
  eager,
}: {
  item: Extract<FeedItem, { type: 'film' }>;
  locale: Locale;
  eager: boolean;
}) {
  const t = useTranslations();
  const { film } = item;
  const href = routes.film(locale, film.slug);
  return (
    <article
      className="grid gap-5 md:grid-cols-[5fr_7fr] md:gap-8"
      aria-labelledby={`t-${item.key}`}
    >
      <Link href={href} tabIndex={-1} aria-hidden="true" className="block">
        <Poster
          image={film.poster}
          ratio="4/5"
          sizes="(min-width: 1056px) 360px, (min-width: 672px) 40vw, 100vw"
          preload={eager}
        />
      </Link>
      <div className="flex flex-col justify-end gap-3 md:py-2">
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone={film.kind === 'SHORT' ? 'highlight' : 'neutral'}>
            {t(`kinds.${film.kind}`)}
          </Tag>
          <Badges item={item} />
        </div>
        {item.surprise ? <p className="text-sm text-muted">{t('feed.surpriseHint')}</p> : null}
        <h2 id={`t-${item.key}`} className="font-serif text-3xl md:text-4xl">
          <Link href={href} className="underline-offset-4 hover:underline">
            {film.title}
          </Link>
        </h2>
        <p className="meta">
          {[filmMeta(film.year, film.runtimeSec), ...film.categories.map((c) => c.name)]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <p className="line-clamp-3 max-w-prose text-muted">{film.synopsis}</p>
        <div className="mt-1 flex items-center gap-1 -ml-2">
          <Link
            href={href}
            className="inline-flex min-h-11 items-center gap-2 px-2 font-medium text-accent hover:underline underline-offset-4"
          >
            {t('feed.openFilm')}
            <Icon name="arrowRight" size={20} />
          </Link>
        </div>
      </div>
    </article>
  );
}

/** Publication photo + texte : défilement horizontal des images (1 à 10), légende, j'aime. */
export function PostCard({
  item,
  liked,
  locale,
}: {
  item: Extract<FeedItem, { type: 'post' }>;
  liked: boolean;
  locale: Locale;
}) {
  const t = useTranslations();
  const { post } = item;
  return (
    <article className="flex flex-col gap-4" aria-label={t('kinds.POST')}>
      <div className="flex flex-wrap items-center gap-2">
        <Tag>{t('kinds.POST')}</Tag>
        <Badges item={item} />
        <span className="meta">{formatDate(post.publishedAt)}</span>
      </div>
      <ul
        // Zone défilante atteignable au clavier (flèches) : WCAG 2.1.1.
        tabIndex={0}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 md:mx-0 md:px-0"
        aria-label={`${post.images.length} image(s)`}
      >
        {post.images.map((image, index) => (
          <li key={`${image.src}-${index}`} className="w-[85%] shrink-0 snap-start md:w-[70%]">
            <div className="relative w-full bg-surface-2" style={{ aspectRatio: '4/5' }}>
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(min-width: 672px) 420px, 85vw"
                className="object-cover"
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="max-w-prose whitespace-pre-line">{post.caption}</p>
      <div className="-ml-2 flex items-center">
        <LikeButton
          targetType="POST"
          targetId={post.id}
          initialLiked={liked}
          initialCount={post.likeCount}
        />
        <Link href={routes.post(locale, post.id)} className="meta ml-2 hover:text-text">
          {t('common.seeMore')}
        </Link>
      </div>
    </article>
  );
}

/** Actualité / annonce / événement : texte d'abord, image en vignette. */
export function ArticleCard({
  item,
  locale,
}: {
  item: Extract<FeedItem, { type: 'article' }>;
  locale: Locale;
}) {
  const t = useTranslations();
  const { article } = item;
  const href = routes.article(locale, article.slug);
  return (
    <article
      className="grid gap-5 border-l-2 border-highlight pl-4 md:grid-cols-[7fr_5fr] md:gap-8"
      aria-labelledby={`t-${item.key}`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone="highlight">{t(`kinds.${article.kind}`)}</Tag>
          <Badges item={item} />
          <span className="meta">{formatDate(article.publishedAt)}</span>
        </div>
        <h2 id={`t-${item.key}`} className="font-serif text-2xl md:text-3xl">
          <Link href={href} className="underline-offset-4 hover:underline">
            {article.title}
          </Link>
        </h2>
        {article.eventStart ? (
          <p className="meta flex items-center gap-2 text-text">
            <Icon name="calendar" size={16} />
            {formatDate(article.eventStart)}
            {article.eventPlace ? ` · ${article.eventPlace}` : ''}
          </p>
        ) : null}
        <p className="line-clamp-3 max-w-prose text-muted">{article.excerpt}</p>
        <Link
          href={href}
          className="inline-flex min-h-11 items-center gap-2 self-start font-medium text-accent hover:underline underline-offset-4"
        >
          {t('feed.readArticle')}
          <Icon name="arrowRight" size={20} />
        </Link>
      </div>
      {article.cover ? (
        <Link href={href} tabIndex={-1} aria-hidden="true">
          <Poster image={article.cover} ratio="3/2" sizes="(min-width: 672px) 320px, 100vw" />
        </Link>
      ) : null}
    </article>
  );
}
