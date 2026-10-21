import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@ecine/contracts';
import { routes } from '@/lib/routes';
import { breadcrumbJsonLd } from '@/server/structured-data';
import { JsonLd } from './json-ld';

/**
 * Fil d'Ariane visible + données structurées BreadcrumbList (pages profondes). L'accueil ouvre
 * toujours le fil ; `items` va de la rubrique à la page courante.
 */
export async function Breadcrumbs({
  locale,
  items,
}: {
  locale: Locale;
  items: Array<{ label: string; href: string }>;
}) {
  const t = await getTranslations('nav');
  const trail = [{ label: t('home'), href: routes.home(locale) }, ...items];
  return (
    <>
      <nav aria-label={t('breadcrumb')} className="meta mb-6">
        <ol className="flex flex-wrap items-center gap-2">
          {trail.map((item, index) => (
            <li key={item.href} className="flex items-center gap-2">
              {index < trail.length - 1 ? (
                <>
                  <Link
                    href={item.href}
                    className="hover:text-text hover:underline underline-offset-4"
                  >
                    {item.label}
                  </Link>
                  <span aria-hidden="true">/</span>
                </>
              ) : (
                <span aria-current="page" className="text-text line-clamp-1">
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd data={breadcrumbJsonLd(trail)} />
    </>
  );
}
