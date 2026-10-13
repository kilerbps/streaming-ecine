import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@ecine/contracts';
import { FilmTile, TileGrid } from '@/components/features/content/film-tile';
import { EmptyState } from '@/components/ui/empty-state';
import { LinkButton } from '@/components/ui/link-button';
import { routes } from '@/lib/routes';
import { getBookmarks, getViewer } from '@/server/data';
import { LargeTitle } from '@/components/layout/header-title';

export const metadata: Metadata = { title: 'Ma liste' };

export default async function MyListPage({
  params,
  searchParams,
}: PageProps<'/[locale]/moi/ma-liste'>) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  if (!(await getViewer()))
    redirect(`${routes.login(locale)}?retour=${encodeURIComponent(routes.myList(locale))}`);
  const cursor = (await searchParams).apres;
  const [t, tc] = await Promise.all([getTranslations('me'), getTranslations('common')]);
  const page = await getBookmarks(typeof cursor === 'string' ? cursor : undefined);
  return (
    <>
      <LargeTitle className="mb-6 md:mb-8">{t('myList')}</LargeTitle>
      {page.items.length === 0 ? (
        <EmptyState title={t('myListEmpty')} />
      ) : (
        <TileGrid>
          {page.items.map((film) => (
            <FilmTile key={film.id} film={film} locale={locale} />
          ))}
        </TileGrid>
      )}
      {page.nextCursor ? (
        <div className="mt-12 flex justify-center">
          <LinkButton
            href={`${routes.myList(locale)}?apres=${encodeURIComponent(page.nextCursor)}`}
          >
            {tc('seeMore')}
          </LinkButton>
        </div>
      ) : null}
    </>
  );
}
