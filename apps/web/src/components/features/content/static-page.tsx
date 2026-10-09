import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@ecine/contracts';
import { formatDate, truncate } from '@/lib/format';
import { Markdown } from '@/lib/markdown';
import { getStaticPage } from '@/server/data';
import { loadOrNotFound } from '@/server/not-found';
import { pageMetadata } from '@/server/seo';

/** Page éditoriale gérée en administration (À propos, pages légales), avec version et date. */
export async function staticPageMetadata(locale: Locale, slug: string): Promise<Metadata> {
  const page = await loadOrNotFound(() => getStaticPage(slug), `/${locale}/${slug}`);
  return pageMetadata({
    locale,
    path: `/${slug}`,
    title: page.title,
    description: truncate(page.body, 160),
  });
}

export async function StaticPageView({
  locale,
  slug,
  children,
}: {
  locale: Locale;
  slug: string;
  children?: React.ReactNode;
}) {
  const page = await loadOrNotFound(() => getStaticPage(slug), `/${locale}/${slug}`);
  const t = await getTranslations('legal');
  return (
    <article className="container-page pt-8 md:pt-12">
      <header className="max-w-3xl">
        <h1 className="font-serif text-4xl md:text-6xl">{page.title}</h1>
        <p className="meta mt-4">
          {t('version', { version: page.version, date: formatDate(page.updatedAt) })}
        </p>
      </header>
      <div className="prose-ecine mt-10 max-w-3xl border-t border-border pt-10">
        <Markdown source={page.body} />
      </div>
      {children}
    </article>
  );
}
