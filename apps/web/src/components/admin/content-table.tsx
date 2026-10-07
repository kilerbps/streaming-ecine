'use client';

import Link from 'next/link';
import type { AdminRow, Page, PublishState } from '@ecine/contracts';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { loadRowsAction } from '@/server/actions/admin/content';
import { StateBadge } from './badges';
import { CONTENT, type ContentKind } from './config';
import { formatShort } from './format';
import { useCursorList } from './use-cursor-list';

/** Liste dense d'un type de contenu : titre, type, état, dernière modification ; « Voir plus » par curseur. */
export function ContentTable({
  kind,
  initial,
  query,
  empty,
}: {
  kind: ContentKind;
  initial: Page<AdminRow>;
  query: { q?: string; state?: PublishState; includeDeleted?: 'true' };
  empty: { title: string; body: string };
}) {
  const { items, hasMore, loadMore, pending } = useCursorList(initial, (cursor) =>
    loadRowsAction(kind, { ...query, cursor }),
  );
  const base = CONTENT[kind].ui;

  if (items.length === 0) {
    return (
      <EmptyState title={query.q || query.state ? 'Aucun résultat pour ces filtres' : empty.title}>
        {query.q || query.state ? 'Modifiez la recherche ou effacez les filtres.' : empty.body}
      </EmptyState>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto border border-border">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-surface-1">
            <tr className="border-b border-border">
              <th scope="col" className="eyebrow px-4 py-3 font-normal text-muted">
                Titre
              </th>
              <th
                scope="col"
                className="eyebrow hidden px-4 py-3 font-normal text-muted md:table-cell"
              >
                Détails
              </th>
              <th scope="col" className="eyebrow px-4 py-3 font-normal text-muted">
                État
              </th>
              <th
                scope="col"
                className="eyebrow hidden px-4 py-3 font-normal text-muted lg:table-cell"
              >
                Modifié le
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border last:border-b-0 hover:bg-surface-1"
              >
                <td className="px-4 py-3 align-top">
                  <Link
                    href={`${base}/${row.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {row.title}
                  </Link>
                  {row.slug ? (
                    <span className="meta mt-1 block normal-case">/{row.slug}</span>
                  ) : null}
                  {row.meta ? <span className="meta mt-1 block md:hidden">{row.meta}</span> : null}
                </td>
                <td className="hidden px-4 py-3 align-top text-muted md:table-cell">{row.meta}</td>
                <td className="px-4 py-3 align-top">
                  <StateBadge state={row.state} deleted={row.deletedAt !== null} />
                </td>
                <td className="hidden px-4 py-3 align-top whitespace-nowrap text-muted lg:table-cell">
                  <time dateTime={row.updatedAt} suppressHydrationWarning>
                    {formatShort(row.updatedAt)}
                  </time>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore ? (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" onClick={loadMore} pending={pending}>
            Voir plus
          </Button>
        </div>
      ) : null}
    </div>
  );
}
