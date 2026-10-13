import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@ecine/contracts';
import { LargeTitle } from '@/components/layout/header-title';
import { MediaImage } from '@/components/ui/media-image';
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
      <header className="mb-6 flex flex-col gap-2 md:mb-8">
        <LargeTitle>{t('listTitle')}</LargeTitle>
        <p className="max-w-[60ch] text-[15px] leading-5 text-muted md:text-base md:leading-6">
          {t('listIntro')}
        </p>
      </header>
      {page.items.length === 0 ? (
        <EmptyState title={t('empty')} />
      ) : (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-4 lg:grid-cols-6 lg:gap-x-4 lg:gap-y-8">
          {page.items.map((person, index) => (
            <li key={person.id}>
              <Link
                transitionTypes={['push']}
                href={routes.person(locale, person.slug)}
                className="press group block"
              >
                <MediaImage
                  image={person.photo}
                  ratio="4/5"
                  preload={index < 2}
                  sizes="(min-width: 1056px) 16vw, (min-width: 672px) 24vw, 48vw"
                  className="rounded-md"
                  imageClassName="transition-transform duration-[var(--dur-base)] ease-[var(--ease-standard)] lg:group-hover:scale-[1.04]"
                />
                <p className="mt-2 line-clamp-2 text-[15px] font-semibold leading-5">
                  {person.name}
                </p>
                <p className="mt-0.5 line-clamp-1 text-[13px] leading-[18px] text-muted">
                  {person.roles.map((r) => tr(r)).join(', ')}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {page.nextCursor ? (
        <div className="mt-12 flex justify-center">
          <LinkButton
            href={`${routes.people(locale)}?apres=${encodeURIComponent(page.nextCursor)}`}
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
