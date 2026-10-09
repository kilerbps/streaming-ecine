import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@ecine/contracts';
import { Poster } from '@/components/features/content/poster';
import { EmptyState } from '@/components/ui/empty-state';
import { LinkButton } from '@/components/ui/link-button';
import { routes } from '@/lib/routes';
import { getPeople } from '@/server/data';
import { pageMetadata } from '@/server/seo';

type Props = PageProps<'/[locale]/personnes'>;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('person');
  return pageMetadata({
    locale: locale as Locale,
    path: '/personnes',
    title: t('listTitle'),
    description: t('listIntro'),
    noIndex: Boolean((await searchParams).apres),
  });
}

export default async function PeoplePage({ params, searchParams }: Props) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const cursor = (await searchParams).apres;
  const [t, tr, tc] = await Promise.all([
    getTranslations('person'),
    getTranslations('roles'),
    getTranslations('common'),
  ]);
  const page = await getPeople(typeof cursor === 'string' ? cursor : undefined);
  return (
    <div className="container-page pt-8 md:pt-12">
      <header className="mb-10 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <h1 className="font-serif text-4xl md:text-6xl">{t('listTitle')}</h1>
        <p className="max-w-sm text-muted md:text-right">{t('listIntro')}</p>
      </header>
      {page.items.length === 0 ? (
        <EmptyState title={t('empty')} />
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 lg:grid-cols-6">
          {page.items.map((person) => (
            <li key={person.id}>
              <Link href={routes.person(locale, person.slug)} className="group block">
                <Poster
                  image={person.photo}
                  ratio="4/5"
                  sizes="(min-width: 1056px) 16vw, (min-width: 672px) 25vw, 46vw"
                />
                <p className="mt-3 font-serif text-lg leading-tight group-hover:underline underline-offset-4">
                  {person.name}
                </p>
                <p className="meta mt-1">{person.roles.map((r) => tr(r)).join(' · ')}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {page.nextCursor ? (
        <div className="mt-12 flex justify-center">
          <LinkButton
            href={`${routes.people(locale)}?apres=${encodeURIComponent(page.nextCursor)}`}
            rel="next"
          >
            {tc('seeMore')}
          </LinkButton>
        </div>
      ) : null}
    </div>
  );
}
