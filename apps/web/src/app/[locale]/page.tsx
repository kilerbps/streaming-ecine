import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@ecine/contracts';
import { ContinueWatching } from '@/components/features/content/continue-watching';
import { FeedList } from '@/components/features/feed/feed-list';
import { PREF_COOKIES } from '@/server/cookie-names';
import { getContinueWatching, getFeed, getLikedIds } from '@/server/data';
import { pageMetadata } from '@/server/seo';

export async function generateMetadata({ params }: PageProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('meta');
  return {
    ...pageMetadata({
      locale: locale as Locale,
      path: '',
      title: t('defaultTitle'),
      description: t('defaultDescription'),
    }),
    title: { absolute: t('defaultTitle') },
  };
}

/** Accueil = feed de découverte (FR-040) : films, courts, publications et actualités, avec surprises. */
export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  const t = await getTranslations('feed');
  const seed = (await cookies()).get(PREF_COOKIES.seed)?.value;
  const [feed, continueWatching] = await Promise.all([
    getFeed(undefined, seed),
    getContinueWatching(),
  ]);
  const postIds = feed.items.flatMap((i) => (i.type === 'post' ? [i.post.id] : []));
  const likedPosts = await getLikedIds('POST', postIds);

  return (
    <div className="container-page max-w-5xl pt-6 md:pt-12">
      <header className="mb-8 grid gap-2 md:mb-12 md:grid-cols-[1fr_auto] md:items-end">
        <h1 className="font-serif text-4xl md:text-6xl">{t('title')}</h1>
        <p className="max-w-sm text-muted md:text-right">{t('intro')}</p>
      </header>
      <ContinueWatching items={continueWatching} locale={locale as Locale} />
      <FeedList
        locale={locale as Locale}
        initialItems={feed.items}
        initialCursor={feed.nextCursor}
        initialLikedPosts={likedPosts}
      />
    </div>
  );
}
