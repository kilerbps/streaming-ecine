import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@ecine/contracts';
import { ContinueWatching } from '@/components/features/content/continue-watching';
import { PREF_COOKIES } from '@/server/cookie-names';
import { getContinueWatching, getFeed, getLikedIds } from '@/server/data';
import { FeedList } from './feed-list';

/**
 * Fil de découverte (FR-040) : films, courts, publications et actualités, avec surprises. Sert
 * l'onglet Découvrir, en attendant le fil vertical d'extraits (lot 4 de la refonte).
 */
export async function DiscoverFeed({ locale }: { locale: Locale }) {
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
        <h1 className="font-display text-[28px] font-extrabold leading-8 lg:text-[40px] lg:leading-[44px]">
          {t('title')}
        </h1>
        <p className="max-w-sm text-muted md:text-right">{t('intro')}</p>
      </header>
      <div className="bleed mb-10">
        <ContinueWatching items={continueWatching} locale={locale} />
      </div>
      <FeedList
        locale={locale}
        initialItems={feed.items}
        initialCursor={feed.nextCursor}
        initialLikedPosts={likedPosts}
      />
    </div>
  );
}
