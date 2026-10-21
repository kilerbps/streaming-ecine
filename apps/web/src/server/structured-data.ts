import 'server-only';
import type {
  ArticleDetail,
  CreditRole,
  FilmDetail,
  Locale,
  PersonDetail,
  SiteSettings,
} from '@ecine/contracts';
import { routes } from '@/lib/routes';
import { absoluteUrl, ogImage } from './seo';

/**
 * Données structurées schema.org (docs/07 §B) : elles décrivent seulement ce que la page affiche.
 * Jamais l'URL d'un flux protégé (`contentUrl`) : les fiches sont publiques, les vidéos non.
 */
type JsonLdObject = Record<string, unknown>;

/** Identifiants stables des entités du site, pour les relier entre pages. */
export const organizationId = () => absoluteUrl('/#organisation');
export const websiteId = () => absoluteUrl('/#site');

/** Retire les champs vides (tableaux vides, chaînes vides, undefined) : schema.org les refuse. */
function compact<T extends JsonLdObject>(data: T): T {
  return Object.fromEntries(
    Object.entries(data).filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        value !== '' &&
        !(Array.isArray(value) && value.length === 0),
    ),
  ) as T;
}

/** Organisation et site (toutes les pages) ; le logo est un PNG carré, mieux lu qu'un SVG. */
export function siteGraph(
  locale: Locale,
  settings: Pick<SiteSettings, 'socials'> | null,
): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      compact({
        '@type': 'Organization',
        '@id': organizationId(),
        name: 'E-Ciné',
        url: absoluteUrl(routes.home(locale)),
        logo: {
          '@type': 'ImageObject',
          url: absoluteUrl('/icons/icon-512.png'),
          width: 512,
          height: 512,
        },
        sameAs: Object.values(settings?.socials ?? {}).filter(Boolean),
      }),
      {
        '@type': 'WebSite',
        '@id': websiteId(),
        name: 'E-Ciné',
        url: absoluteUrl(routes.home(locale)),
        inLanguage: locale,
        publisher: { '@id': organizationId() },
      },
    ],
  };
}

/** Durée ISO 8601 (« PT1H37M »). */
export function isoDuration(seconds: number | null): string | undefined {
  if (!seconds || seconds <= 0) return undefined;
  const minutes = Math.round(seconds / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `PT${h ? `${h}H` : ''}${m || !h ? `${m}M` : ''}`;
}

/** Fiche film : Movie (Google, carrousels de films avec la liste ItemList des catalogues). */
export function movieJsonLd(film: FilmDetail, locale: Locale): JsonLdObject {
  const url = absoluteUrl(routes.film(locale, film.slug));
  const people = (role: CreditRole) =>
    film.credits
      .filter((c) => c.role === role)
      .map((c) => ({
        '@type': 'Person',
        name: c.person.name,
        url: absoluteUrl(routes.person(locale, c.person.slug)),
      }));
  return compact({
    '@context': 'https://schema.org',
    '@type': 'Movie',
    '@id': `${url}#film`,
    url,
    name: film.title,
    alternateName: film.originalTitle ?? undefined,
    description: film.synopsis,
    image: ogImage(film.poster),
    datePublished: film.publishedAt ?? undefined,
    dateCreated: film.year ? String(film.year) : undefined,
    dateModified: film.updatedAt,
    duration: isoDuration(film.runtimeSec),
    genre: film.categories.map((c) => c.name),
    contentRating: film.ageRating ?? undefined,
    inLanguage: film.audioLanguages[0],
    subtitleLanguage: film.subtitleLanguages,
    director: people('DIRECTOR'),
    actor: people('ACTOR'),
    producer: people('PRODUCER'),
    author: people('WRITER'),
    musicBy: people('COMPOSER'),
    // Plateforme gratuite et ouverte à tous (docs/01).
    isAccessibleForFree: true,
    provider: { '@id': organizationId() },
  });
}

/** Fiche talent : page de profil dont l'entité principale est la personne. */
export function profileJsonLd(
  person: PersonDetail,
  locale: Locale,
  jobTitles: string[],
): JsonLdObject {
  const url = absoluteUrl(routes.person(locale, person.slug));
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url,
    dateModified: person.updatedAt,
    mainEntity: compact({
      '@type': 'Person',
      '@id': `${url}#personne`,
      name: person.name,
      url,
      image: ogImage(person.photo),
      description: person.bio || undefined,
      birthDate: person.birthYear ? String(person.birthYear) : undefined,
      jobTitle: jobTitles,
      sameAs: Object.values(person.socials).filter(Boolean),
    }),
  };
}

/**
 * Actualité : NewsArticle ; un événement daté devient Event (date de début et lieu exigés par
 * Google, sinon l'article reste un NewsArticle).
 */
export function articleJsonLd(article: ArticleDetail, locale: Locale): JsonLdObject {
  const url = absoluteUrl(routes.article(locale, article.slug));
  const image = ogImage(article.cover);
  if (article.kind === 'EVENT' && article.eventStart && article.eventPlace) {
    return compact({
      '@context': 'https://schema.org',
      '@type': 'Event',
      '@id': `${url}#evenement`,
      url,
      name: article.title,
      description: article.excerpt,
      image,
      startDate: article.eventStart,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: { '@type': 'Place', name: article.eventPlace, address: article.eventPlace },
    });
  }
  return compact({
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    '@id': `${url}#article`,
    mainEntityOfPage: url,
    url,
    headline: article.title,
    description: article.excerpt,
    image,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: { '@type': 'Person', name: article.author.name },
    publisher: { '@id': organizationId() },
    inLanguage: locale,
  });
}

/** Liste d'une page de catalogue (« summary page ») : chaque élément renvoie vers sa fiche. */
export function itemListJsonLd(name: string, urls: string[]): JsonLdObject | null {
  if (urls.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: urls.length,
    itemListElement: urls.map((url, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: absoluteUrl(url),
    })),
  };
}

/** Fil d'Ariane, de l'accueil à la page courante. */
export function breadcrumbJsonLd(items: Array<{ label: string; href: string }>): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: absoluteUrl(item.href),
    })),
  };
}
