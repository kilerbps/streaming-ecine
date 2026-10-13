'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { FeedItem, Locale } from '@ecine/contracts';
import { LikeButton } from '@/components/features/interactions/like-button';
import { Icon } from '@/components/ui/icon';
import { LinkButton } from '@/components/ui/link-button';
import { MediaImage } from '@/components/ui/media-image';
import { Tag } from '@/components/ui/tag';
import { filmMeta, formatDate, formatDateTime } from '@/lib/format';
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

/** Titre de carte du fil : Archivo, 28 puis 34 px. */
const CARD_TITLE =
  'font-display text-[28px] font-extrabold leading-8 tracking-[-0.01em] text-balance lg:text-[34px] lg:leading-[38px]';
const CARD_META = 'text-[15px] leading-5 text-muted';

/** Film / court-métrage : image 4:5 rayon 16, titre Archivo, informations, « Voir le film ». */
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
      className="grid gap-4 md:grid-cols-[5fr_7fr] md:items-end md:gap-8"
      aria-labelledby={`t-${item.key}`}
    >
      <Link
        transitionTypes={['push']}
        href={href}
        tabIndex={-1}
        aria-hidden="true"
        className="press group block"
      >
        <MediaImage
          image={film.poster}
          ratio="4/5"
          sizes="(min-width: 1056px) 400px, (min-width: 672px) 40vw, 100vw"
          preload={eager}
          className="rounded-lg"
          imageClassName="transition-transform duration-[var(--dur-base)] ease-[var(--ease-standard)] lg:group-hover:scale-[1.03]"
        />
      </Link>
      <div className="flex flex-col gap-3 md:pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone={film.kind === 'SHORT' ? 'highlight' : 'neutral'}>
            {t(`kinds.${film.kind}`)}
          </Tag>
          <Badges item={item} />
        </div>
        {item.surprise ? <p className={CARD_META}>{t('feed.surpriseHint')}</p> : null}
        <h2 id={`t-${item.key}`} className={CARD_TITLE}>
          <Link
            transitionTypes={['push']}
            href={href}
            className="underline-offset-4 hover:underline"
          >
            {film.title}
          </Link>
        </h2>
        <p className={CARD_META}>
          {[filmMeta(film.year, film.runtimeSec), ...film.categories.map((c) => c.name)]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <p className="line-clamp-3 max-w-prose text-[15px] leading-[22px]">{film.synopsis}</p>
        <LinkButton
          transitionTypes={['push']}
          href={href}
          icon="play"
          className="mt-1 self-start"
          tabIndex={-1}
          aria-hidden="true"
        >
          {t('feed.openFilm')}
        </LinkButton>
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
        <span className="text-[13px] leading-[18px] text-muted">
          {formatDate(post.publishedAt)}
        </span>
      </div>
      <ul
        // Zone défilante atteignable au clavier (flèches) : WCAG 2.1.1.
        tabIndex={0}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 md:mx-0 md:px-0"
        aria-label={`${post.images.length} image(s)`}
      >
        {post.images.map((image, index) => (
          <li
            key={`${image.src}-${index}`}
            className="w-[85%] shrink-0 snap-start md:w-[44%] lg:w-[36%]"
          >
            <MediaImage
              image={image}
              ratio="4/5"
              sizes="(min-width: 1056px) 360px, (min-width: 672px) 44vw, 85vw"
              className="rounded-lg"
            />
          </li>
        ))}
      </ul>
      <p className="max-w-prose whitespace-pre-line text-[15px] leading-[22px]">{post.caption}</p>
      <div className="-ml-2 flex items-center">
        <LikeButton
          targetType="POST"
          targetId={post.id}
          initialLiked={liked}
          initialCount={post.likeCount}
        />
        <Link
          href={routes.post(locale, post.id)}
          className="ml-2 inline-flex min-h-11 items-center text-[15px] font-semibold text-muted hover:text-text"
        >
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
      className="grid gap-4 md:grid-cols-[7fr_5fr] md:items-center md:gap-8"
      aria-labelledby={`t-${item.key}`}
    >
      {article.cover ? (
        <Link
          transitionTypes={['push']}
          href={href}
          tabIndex={-1}
          aria-hidden="true"
          className="press block md:order-last"
        >
          <MediaImage
            image={article.cover}
            ratio="16/9"
            sizes="(min-width: 672px) 400px, 100vw"
            className="rounded-md"
          />
        </Link>
      ) : null}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone={article.kind === 'EVENT' ? 'highlight' : 'neutral'}>
            {t(`kinds.${article.kind}`)}
          </Tag>
          <Badges item={item} />
          <span className="text-[13px] leading-[18px] text-muted">
            {formatDate(article.publishedAt)}
          </span>
        </div>
        <h2
          id={`t-${item.key}`}
          className="font-display text-2xl font-extrabold leading-[30px] tracking-[-0.01em] text-balance"
        >
          <Link
            transitionTypes={['push']}
            href={href}
            className="underline-offset-4 hover:underline"
          >
            {article.title}
          </Link>
        </h2>
        {article.eventStart ? (
          <p className="flex items-center gap-2 text-[15px] leading-5">
            <Icon name="calendar" size={20} className="text-muted" />
            {formatDateTime(article.eventStart)}
            {article.eventPlace ? `, ${article.eventPlace}` : ''}
          </p>
        ) : null}
        <p className="line-clamp-3 max-w-prose text-[15px] leading-[22px] text-muted">
          {article.excerpt}
        </p>
      </div>
    </article>
  );
}
