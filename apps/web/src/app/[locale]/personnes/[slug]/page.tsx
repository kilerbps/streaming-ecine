import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { CreditRole, FilmSummary, Locale, PersonDetail } from '@ecine/contracts';
import { HeroTitle } from '@/components/layout/header-title';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { JsonLd } from '@/components/seo/json-ld';
import { ExpandableText } from '@/components/ui/expandable-text';
import { Icon } from '@/components/ui/icon';
import { MediaImage } from '@/components/ui/media-image';
import { pillClasses } from '@/components/ui/pill';
import { Row } from '@/components/ui/row';
import { PosterTile } from '@/components/ui/tiles';
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

/** Un film par tuile, même si la personne y tient plusieurs rôles (« Réalisation, Production »). */
function filmographyByFilm(filmography: PersonDetail['filmography']) {
  const films = new Map<string, { film: FilmSummary; roles: CreditRole[]; characters: string[] }>();
  for (const { film, role, character } of filmography) {
    const entry = films.get(film.id) ?? { film, roles: [], characters: [] };
    if (!entry.roles.includes(role)) entry.roles.push(role);
    if (character && !entry.characters.includes(character)) entry.characters.push(character);
    films.set(film.id, entry);
  }
  return [...films.values()];
}

/**
 * Fiche talent (docs/design/04) : portrait 4:5 avec voile, nom en Archivo, rôles et année de
 * naissance posés dessus ; biographie avec « plus », réseaux, filmographie en rangée d'affiches.
 * Mobile : portrait plein cadre ; PC : portrait à gauche, texte à droite.
 */
export default async function PersonPage({ params }: Props) {
  const { locale: raw, slug } = await params;
  const locale = raw as Locale;
  const person = await loadOrNotFound(() => getPerson(slug), `/${locale}/personnes/${slug}`);
  const [t, tr, tc] = await Promise.all([
    getTranslations('person'),
    getTranslations('roles'),
    getTranslations('film'),
  ]);
  const socials = Object.entries(person.socials).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  );
  const films = filmographyByFilm(person.filmography);

  return (
    <article className="pb-12">
      <div className="container-page max-md:px-0 md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-10 md:pt-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
        <div
          data-theme="dark"
          className="relative overflow-hidden bg-bg md:self-start md:rounded-lg"
        >
          <MediaImage
            image={person.photo}
            ratio="4/5"
            preload
            sizes="(min-width: 1056px) 33vw, (min-width: 672px) 42vw, 100vw"
          />
          <div className="absolute inset-0 bg-[image:var(--scrim-bottom)]" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 px-4 pb-5 md:px-6 md:pb-6">
            {person.roles.length > 0 ? (
              <p className="text-[15px] font-semibold leading-5 text-muted">
                {person.roles.map((r) => tr(r)).join(', ')}
              </p>
            ) : null}
            <HeroTitle
              title={person.name}
              className="font-display text-[34px] font-extrabold leading-[38px] tracking-[-0.02em] text-balance lg:text-[44px] lg:leading-[48px]"
            >
              {person.name}
            </HeroTitle>
            {person.birthYear ? (
              <p className="text-[15px] leading-5 text-muted">
                {t('born', { year: person.birthYear })}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-6 px-4 md:mt-0 md:px-0">
          <div className="hidden md:block [&_nav]:mb-0">
            <Breadcrumbs
              items={[
                { label: t('listTitle'), href: routes.people(locale) },
                { label: person.name, href: routes.person(locale, person.slug) },
              ]}
            />
          </div>
          {person.bio ? (
            <ExpandableText
              moreLabel={tc('more')}
              className="max-w-[68ch] text-[15px] leading-[22px] md:text-[17px] md:leading-[26px]"
            >
              {person.bio}
            </ExpandableText>
          ) : null}
          {socials.length > 0 ? (
            <ul className="flex flex-wrap gap-2" aria-label={t('socials')}>
              {socials.map(([network, url]) => (
                <li key={network}>
                  <a
                    href={url}
                    rel="noopener noreferrer me"
                    target="_blank"
                    className={pillClasses()}
                  >
                    {SOCIAL_LABELS[network] ?? network}
                    <Icon name="external" size={16} className="text-muted" />
                    <span className="sr-only">{tc('newTab')}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {films.length > 0 ? (
        <div className="mt-8 lg:mt-12">
          <Row id="filmographie" title={t('filmography')}>
            {films.map(({ film, roles, characters }) => (
              <PosterTile
                key={film.id}
                href={routes.film(locale, film.slug)}
                title={film.title}
                image={film.poster}
                meta={
                  characters.length > 0 ? characters.join(', ') : roles.map((r) => tr(r)).join(', ')
                }
              />
            ))}
          </Row>
        </div>
      ) : null}
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
