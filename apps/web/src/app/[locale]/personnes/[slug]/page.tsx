import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@ecine/contracts';
import { Poster } from '@/components/features/content/poster';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { JsonLd } from '@/components/seo/json-ld';
import { Icon } from '@/components/ui/icon';
import { MotifBand } from '@/components/ui/motif';
import { filmMeta } from '@/lib/format';
import { routes } from '@/lib/routes';
import { getPerson } from '@/server/data';
import { loadOrNotFound } from '@/server/not-found';
import { absoluteUrl, ogImage, pageMetadata } from '@/server/seo';

type Props = PageProps<'/[locale]/personnes/[slug]'>;

const SOCIAL_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  x: 'X',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  website: 'Site web',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const person = await loadOrNotFound(() => getPerson(slug), `/${locale}/personnes/${slug}`);
  const tr = await getTranslations('roles');
  const roles = person.roles.map((r) => tr(r)).join(', ');
  return pageMetadata({
    locale: locale as Locale,
    path: `/personnes/${person.slug}`,
    title: roles ? `${person.name} — ${roles}` : person.name,
    description: person.bio || `${person.name}, ${roles}. Filmographie sur E-Ciné.`,
    image: person.photo,
    type: 'profile',
  });
}

export default async function PersonPage({ params }: Props) {
  const { locale: raw, slug } = await params;
  const locale = raw as Locale;
  const person = await loadOrNotFound(() => getPerson(slug), `/${locale}/personnes/${slug}`);
  const [t, tr, tk] = await Promise.all([
    getTranslations('person'),
    getTranslations('roles'),
    getTranslations('kinds'),
  ]);
  const socials = Object.entries(person.socials).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  );

  return (
    <article className="container-page pt-8 md:pt-12">
      <Breadcrumbs
        items={[
          { label: t('listTitle'), href: routes.people(locale) },
          { label: person.name, href: routes.person(locale, person.slug) },
        ]}
      />
      <div className="grid gap-8 md:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] md:gap-14">
        <Poster image={person.photo} ratio="4/5" sizes="(min-width: 672px) 35vw, 100vw" preload />
        <div className="flex flex-col justify-end">
          <p className="eyebrow text-signal-text">{person.roles.map((r) => tr(r)).join(' · ')}</p>
          <h1 className="mt-3 font-serif text-4xl md:text-6xl">{person.name}</h1>
          {person.birthYear ? (
            <p className="meta mt-3">{t('born', { year: person.birthYear })}</p>
          ) : null}
          {person.bio ? (
            <p className="mt-6 max-w-prose whitespace-pre-line text-lg leading-relaxed">
              {person.bio}
            </p>
          ) : null}
          {socials.length > 0 ? (
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2" aria-label={t('socials')}>
              {socials.map(([network, url]) => (
                <li key={network}>
                  <a
                    href={url}
                    rel="noopener noreferrer me"
                    target="_blank"
                    className="inline-flex min-h-11 items-center gap-2 underline underline-offset-4"
                  >
                    {SOCIAL_LABELS[network] ?? network}
                    <Icon name="external" size={16} />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <MotifBand name="damier" className="mt-16 opacity-60" />
      <section aria-labelledby="filmographie" className="mt-10">
        <h2 id="filmographie" className="font-serif text-3xl">
          {t('filmography')}
        </h2>
        <ol className="mt-6 divide-y divide-border border-y border-border">
          {person.filmography.map(({ film, role, character }) => (
            <li key={`${film.id}-${role}-${character ?? ''}`}>
              <Link
                href={routes.film(locale, film.slug)}
                className="grid grid-cols-[64px_1fr] items-center gap-4 py-4 hover:bg-surface-1 md:grid-cols-[64px_1fr_auto]"
              >
                <Poster image={film.poster} sizes="64px" />
                <div>
                  <p className="font-serif text-xl">{film.title}</p>
                  <p className="text-sm text-muted">
                    {tr(role)}
                    {character ? ` — ${character}` : ''}
                  </p>
                </div>
                <p className="meta col-start-2 md:col-start-3">
                  {tk(film.kind)} · {filmMeta(film.year, film.runtimeSec)}
                </p>
              </Link>
            </li>
          ))}
        </ol>
      </section>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Person',
          name: person.name,
          url: absoluteUrl(routes.person(locale, person.slug)),
          image: ogImage(person.photo),
          description: person.bio || undefined,
          birthDate: person.birthYear ? String(person.birthYear) : undefined,
          jobTitle: person.roles.map((r) => tr(r)),
          sameAs: socials.map(([, url]) => url),
        }}
      />
    </article>
  );
}
