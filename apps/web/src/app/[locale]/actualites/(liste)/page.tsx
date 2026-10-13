import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { articleKindSchema, type Locale } from '@ecine/contracts';
import { ArticleCard } from '@/components/features/content/article-card';
import { EmptyState } from '@/components/ui/empty-state';
import { LinkButton } from '@/components/ui/link-button';
import { PillLink } from '@/components/ui/pill';
import { routes } from '@/lib/routes';
import { getArticles } from '@/server/data';
import { pageMetadata } from '@/server/seo';
import { LargeTitle } from '@/components/layout/header-title';
import { PullToRefresh } from '@/components/features/system/pull-to-refresh';

type Props = PageProps<'/[locale]/actualites'>;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations('news');
  return pageMetadata({
    locale: locale as Locale,
    path: '/actualites',
    title: t('listTitle'),
    description: t('listIntro'),
    noIndex: Boolean(sp.apres || sp.type),
  });
}

export default async function NewsPage({ params, searchParams }: Props) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const sp = await searchParams;
  const kind = articleKindSchema.safeParse(sp.type).data;
  const cursor = typeof sp.apres === 'string' ? sp.apres : undefined;
  const [t, tk, tc] = await Promise.all([
    getTranslations('news'),
    getTranslations('kinds'),
    getTranslations('common'),
  ]);
  const page = await getArticles({ kind, cursor });
  const base = routes.news(locale);
  const filters = [
    { label: t('all'), href: base, active: !kind },
    ...articleKindSchema.options.map((k) => ({
      label: tk(k),
      href: `${base}?type=${k}`,
      active: kind === k,
    })),
  ];
  const [lead, ...rest] = page.items;

  return (
    <div className="container-page pt-8 md:pt-12">
      <PullToRefresh />
      <header className="mb-5 flex flex-col gap-2 md:mb-6">
        <LargeTitle>{t('listTitle')}</LargeTitle>
        <p className="max-w-[60ch] text-[15px] leading-5 text-muted md:text-base md:leading-6">
          {t('listIntro')}
        </p>
      </header>
      <nav aria-label={t('kindsNav')} className="-mx-4 mb-6 md:-mx-8 lg:mx-0 lg:mb-8">
        <ul className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1 md:px-8 lg:px-0">
          {filters.map((f) => (
            <li key={f.href}>
              <PillLink href={f.href} selected={f.active}>
                {f.label}
              </PillLink>
            </li>
          ))}
        </ul>
      </nav>
      {!lead ? (
        <EmptyState title={t('empty')} />
      ) : (
        <>
          <ArticleCard article={lead} locale={locale} variant="lead" eager />
          {rest.length > 0 ? (
            <ul className="mt-8 flex flex-col gap-6 border-t border-border pt-6 md:grid md:grid-cols-2 md:gap-x-4 md:gap-y-8 lg:grid-cols-3 lg:gap-x-6">
              {rest.map((article) => (
                <li key={article.id}>
                  <ArticleCard article={article} locale={locale} />
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
      {page.nextCursor ? (
        <div className="mt-12 flex justify-center">
          <LinkButton
            href={`${base}?${kind ? `type=${kind}&` : ''}apres=${encodeURIComponent(page.nextCursor)}`}
            variant="secondary"
            rel="next"
          >
            {tc('seeMore')}
          </LinkButton>
        </div>
      ) : null}
    </div>
  );
}
