'use client';

import type { AuditEntry, Page } from '@ecine/contracts';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { loadAuditAction } from '@/server/actions/admin/community';
import { formatShort } from './format';
import { auditLabel } from './labels';
import { useCursorList } from './use-cursor-list';

/** Journal d'audit : qui a fait quoi, quand (lecture seule, le plus récent en premier). */
export function AuditList({ initial }: { initial: Page<AuditEntry> }) {
  const { items, hasMore, loadMore, pending } = useCursorList(initial, loadAuditAction);
  if (items.length === 0)
    return (
      <EmptyState title="Journal vide">Les actions d’administration apparaîtront ici.</EmptyState>
    );
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-surface-1">
            <tr className="border-b border-border">
              {['Date', 'Auteur', 'Action', 'Élément'].map((h) => (
                <th key={h} scope="col" className="eyebrow px-4 py-3 font-normal text-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((entry) => (
              <tr key={entry.id} className="border-b border-border align-top last:border-b-0">
                <td className="px-4 py-2.5 whitespace-nowrap text-muted">
                  <time dateTime={entry.createdAt} suppressHydrationWarning>
                    {formatShort(entry.createdAt)}
                  </time>
                </td>
                <td className="px-4 py-2.5">
                  {entry.actor ?? <span className="text-muted">Système</span>}
                </td>
                <td className="px-4 py-2.5">
                  <span className="block">{auditLabel(entry.action)}</span>
                  <span className="font-mono text-xs text-muted">{entry.action}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="block">{entry.entity}</span>
                  {entry.entityId ? (
                    <span className="font-mono text-xs break-all text-muted">{entry.entityId}</span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore ? (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={loadMore} pending={pending}>
            Voir plus
          </Button>
        </div>
      ) : null}
    </div>
  );
}
