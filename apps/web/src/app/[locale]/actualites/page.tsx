import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { articleKindSchema, type Locale } from '@ecine/contracts';
import { Poster } from '@/components/features/content/poster';
import { EmptyState } from '@/components/ui/empty-state';
import { LinkButton } from '@/components/ui/link-button';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';
import { getArticles } from '@/server/data';
import { pageMetadata } from '@/server/seo';

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
      <header className="mb-8 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <h1 className="font-serif text-4xl md:text-6xl">{t('listTitle')}</h1>
        <p className="max-w-sm text-muted md:text-right">{t('listIntro')}</p>
      </header>
      <nav aria-label="Types d'actualités" className="mb-10 flex flex-wrap gap-2">
        {filters.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            aria-current={f.active ? 'page' : undefined}
            className={`eyebrow inline-flex min-h-11 items-center border px-4 ${f.active ? 'border-accent bg-accent text-on-accent' : 'border-border-strong hover:bg-surface-2'}`}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      {!lead ? (
        <EmptyState title={t('empty')} />
      ) : (
        <>
          {/* Composition asymétrique : un article principal, puis une liste éditoriale. */}
          <Link
            href={routes.article(locale, lead.slug)}
            className="group grid gap-6 border-b border-border pb-10 md:grid-cols-[7fr_5fr] md:gap-10"
          >
            <Poster image={lead.cover} ratio="3/2" sizes="(min-width: 672px) 58vw, 100vw" preload />
            <div className="flex flex-col justify-end gap-3">
              <p className="eyebrow text-signal-text">
                {tk(lead.kind)} · <span className="text-muted">{formatDate(lead.publishedAt)}</span>
              </p>
              <h2 className="font-serif text-3xl md:text-4xl group-hover:underline underline-offset-4">
                {lead.title}
              </h2>
              <p className="text-muted">{lead.excerpt}</p>
            </div>
          </Link>
          <ul className="divide-y divide-border">
            {rest.map((article) => (
              <li key={article.id}>
                <Link
                  href={routes.article(locale, article.slug)}
                  className="group grid grid-cols-[1fr_96px] gap-4 py-6 md:grid-cols-[160px_1fr_200px] md:gap-8"
                >
                  <p className="meta order-last col-span-2 md:order-none md:col-span-1">
                    {tk(article.kind)}
                    <br className="hidden md:block" /> {formatDate(article.publishedAt)}
                  </p>
                  <div>
                    <h2 className="font-serif text-2xl group-hover:underline underline-offset-4">
                      {article.title}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-muted">{article.excerpt}</p>
                  </div>
                  <Poster image={article.cover} ratio="3/2" sizes="200px" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      {page.nextCursor ? (
        <div className="mt-12 flex justify-center">
          <LinkButton
            href={`${base}?${kind ? `type=${kind}&` : ''}apres=${encodeURIComponent(page.nextCursor)}`}
            rel="next"
          >
            {tc('seeMore')}
          </LinkButton>
        </div>
      ) : null}
    </div>
  );
}
