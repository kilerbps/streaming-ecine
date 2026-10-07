import Link from 'next/link';
import { absoluteUrl } from '@/server/seo';
import { JsonLd } from './json-ld';

/** Fil d'Ariane visible + données structurées BreadcrumbList (pages profondes). */
export function Breadcrumbs({ items }: { items: Array<{ label: string; href: string }> }) {
  return (
    <>
      <nav aria-label="Fil d'Ariane" className="meta mb-6">
        <ol className="flex flex-wrap items-center gap-2">
          {items.map((item, index) => (
            <li key={item.href} className="flex items-center gap-2">
              {index < items.length - 1 ? (
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
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.label,
            item: absoluteUrl(item.href),
          })),
        }}
      />
    </>
  );
}
