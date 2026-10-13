import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { ArticleSummary, Locale } from '@ecine/contracts';
import { Icon } from '@/components/ui/icon';
import { MediaImage } from '@/components/ui/media-image';
import { Tag } from '@/components/ui/tag';
import { formatDate, formatDateTime } from '@/lib/format';
import { routes } from '@/lib/routes';

/** Type et date (ou, pour un événement, date et lieu) : la ligne d'information d'une carte. */
async function ArticleMeta({ article }: { article: ArticleSummary }) {
  const t = await getTranslations('kinds');
  const event = article.kind === 'EVENT' && article.eventStart;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] leading-[18px] text-muted">
      <Tag tone={article.kind === 'EVENT' ? 'highlight' : 'neutral'}>{t(article.kind)}</Tag>
      {event ? (
        <span className="inline-flex items-center gap-1">
          <Icon name="calendar" size={16} className="text-subtle" />
          {formatDateTime(article.eventStart!)}
          {article.eventPlace ? `, ${article.eventPlace}` : ''}
        </span>
      ) : (
        <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
      )}
    </div>
  );
}

/**
 * Carte d'actualité (Nouveautés, recherche) : image 16:9 rayon 12, type, date, titre ; toute la carte
 * est le lien. `lead` : article à la une (image et texte côte à côte sur PC, extrait visible) ;
 * `row` : ligne compacte sur mobile (vignette à gauche), carte en colonne sur PC.
 */
export async function ArticleCard({
  article,
  locale,
  variant = 'row',
  eager = false,
}: {
  article: ArticleSummary;
  locale: Locale;
  variant?: 'lead' | 'row';
  eager?: boolean;
}) {
  const href = routes.article(locale, article.slug);
  if (variant === 'lead') {
    return (
      <Link
        transitionTypes={['push']}
        href={href}
        className="press group grid gap-4 md:grid-cols-[7fr_5fr] md:items-center md:gap-8"
      >
        <MediaImage
          image={article.cover}
          ratio="16/9"
          preload={eager}
          sizes="(min-width: 672px) 58vw, 100vw"
          className="rounded-md"
        />
        <div className="flex flex-col gap-2">
          <ArticleMeta article={article} />
          <h2 className="text-xl font-bold leading-[25px] text-balance lg:text-2xl lg:leading-[30px]">
            {article.title}
          </h2>
          <p className="line-clamp-3 text-[15px] leading-5 text-muted">{article.excerpt}</p>
        </div>
      </Link>
    );
  }
  return (
    <Link
      transitionTypes={['push']}
      href={href}
      className="press group grid grid-cols-[minmax(0,1fr)_120px] items-start gap-3 md:flex md:flex-col md:gap-3"
    >
      <div className="flex flex-col gap-1.5 md:order-last">
        <ArticleMeta article={article} />
        <h3 className="line-clamp-3 text-[15px] font-semibold leading-5 md:text-[17px] md:leading-[22px]">
          {article.title}
        </h3>
      </div>
      <MediaImage
        image={article.cover}
        ratio="16/9"
        sizes="(min-width: 1056px) 30vw, (min-width: 672px) 45vw, 120px"
        className="rounded-sm md:rounded-md"
      />
    </Link>
  );
}
