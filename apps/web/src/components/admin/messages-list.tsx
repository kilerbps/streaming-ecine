'use client';

import type { ContactMessage, Page } from '@ecine/contracts';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { loadMessagesAction, markMessageHandledAction } from '@/server/actions/admin/community';
import { Badge } from './badges';
import { formatShort } from './format';
import { useAdminAction } from './use-admin-action';
import { useCursorList } from './use-cursor-list';

/** Messages reçus par le formulaire de contact : lecture et suivi (« traité »). */
export function MessagesList({ initial }: { initial: Page<ContactMessage> }) {
  const { items, hasMore, loadMore, pending: loading } = useCursorList(initial, loadMessagesAction);
  const { run, pending } = useAdminAction();

  if (items.length === 0) {
    return (
      <EmptyState title="Aucun message">
        Les messages envoyés depuis la page Contact apparaîtront ici.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {items.map((message) => (
          <li
            key={message.id}
            className={`border bg-surface-1 ${message.handledAt ? 'border-border' : 'border-border-strong'}`}
          >
            <details open={!message.handledAt}>
              <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                {message.handledAt ? (
                  <Badge tone="muted">Traité</Badge>
                ) : (
                  <Badge tone="highlight">À traiter</Badge>
                )}
                <span className="font-medium">{message.subject}</span>
                <span className="text-sm text-muted">
                  {message.name} · {message.email}
                </span>
                <span className="meta ml-auto">
                  <time dateTime={message.createdAt} suppressHydrationWarning>
                    {formatShort(message.createdAt)}
                  </time>
                </span>
              </summary>
              <div className="border-t border-border px-4 py-4">
                <p className="max-w-prose whitespace-pre-line">{message.body}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <a
                    href={`mailto:${message.email}?subject=${encodeURIComponent(`Re : ${message.subject}`)}`}
                    className="inline-flex min-h-9 items-center border border-border-strong px-3 text-sm hover:bg-surface-2"
                  >
                    Répondre par e-mail
                  </a>
                  {!message.handledAt ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon="check"
                      pending={pending}
                      onClick={() =>
                        run(() => markMessageHandledAction(message.id), {
                          success: 'Message marqué comme traité.',
                        })
                      }
                    >
                      Marquer comme traité
                    </Button>
                  ) : (
                    <span className="text-sm text-muted">
                      Traité le{' '}
                      <time dateTime={message.handledAt} suppressHydrationWarning>
                        {formatShort(message.handledAt)}
                      </time>
                    </span>
                  )}
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
      {hasMore ? (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={loadMore} pending={loading}>
            Voir plus
          </Button>
        </div>
      ) : null}
    </div>
  );
}
