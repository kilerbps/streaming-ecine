'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Page, Report } from '@ecine/contracts';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { loadReportsAction, updateReportAction } from '@/server/actions/admin/community';
import { Badge } from './badges';
import { ConfirmSheet } from './confirm-sheet';
import { formatShort } from './format';
import { REPORT_REASON_LABELS, REPORT_STATE_LABELS, REPORT_TARGET_LABELS } from './labels';
import { useAdminAction } from './use-admin-action';
import { useCursorList } from './use-cursor-list';

type ReportState = Report['state'];

const ADMIN_PATHS: Record<string, string> = {
  FILM: '/admin/films',
  ARTICLE: '/admin/actualites',
  POST: '/admin/publications',
  PERSON: '/admin/people',
};

/** Lien vers le contenu signalé : fiche d'administration (éditeurs) ou page publique quand l'adresse est connue. */
function targetHref(report: Report, canEdit: boolean): string | null {
  if (canEdit && ADMIN_PATHS[report.targetType])
    return `${ADMIN_PATHS[report.targetType]}/${report.targetId}`;
  if (report.targetType === 'POST') return `/fr/publications/${report.targetId}`;
  return null;
}

/** File de modération : traiter (résoudre / rejeter) ou masquer le contenu signalé. */
export function ReportsList({
  initial,
  state,
  canEdit,
}: {
  initial: Page<Report>;
  state: ReportState;
  canEdit: boolean;
}) {
  const {
    items,
    setItems,
    hasMore,
    loadMore,
    pending: loading,
  } = useCursorList(initial, (cursor) => loadReportsAction({ state, cursor }));
  const { run, pending } = useAdminAction();
  const [hiding, setHiding] = useState<Report | null>(null);

  const decide = (
    report: Report,
    next: 'RESOLVED' | 'REJECTED',
    action: 'NONE' | 'HIDE_CONTENT' = 'NONE',
  ) =>
    run(() => updateReportAction(report.id, { state: next, action }), {
      success:
        action === 'HIDE_CONTENT'
          ? 'Contenu masqué (archivé) et signalement résolu.'
          : next === 'RESOLVED'
            ? 'Signalement résolu.'
            : 'Signalement rejeté.',
      onSuccess: () => {
        setHiding(null);
        setItems((current) => current.filter((r) => r.id !== report.id));
      },
    });

  if (items.length === 0) {
    return (
      <EmptyState
        title={
          state === 'OPEN'
            ? 'Aucun signalement en attente'
            : `Aucun signalement ${REPORT_STATE_LABELS[state].toLowerCase()}`
        }
      >
        {state === 'OPEN'
          ? 'La file de modération est vide. Les nouveaux signalements des membres apparaîtront ici.'
          : null}
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {items.map((report) => {
          const href = targetHref(report, canEdit);
          return (
            <li key={report.id} className="border border-border bg-surface-1 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={report.reason === 'RIGHTS' ? 'danger' : 'highlight'}>
                  {REPORT_REASON_LABELS[report.reason] ?? report.reason}
                </Badge>
                <span className="text-sm">
                  {REPORT_TARGET_LABELS[report.targetType] ?? report.targetType}
                </span>
                <span className="meta ml-auto">
                  <time dateTime={report.createdAt} suppressHydrationWarning>
                    {formatShort(report.createdAt)}
                  </time>
                </span>
              </div>
              {report.details ? (
                <p className="mt-3 whitespace-pre-line">{report.details}</p>
              ) : (
                <p className="mt-3 text-sm text-muted">Aucun détail fourni.</p>
              )}
              <p className="meta mt-3 normal-case">
                Identifiant du contenu : {report.targetId}
                {href ? (
                  <>
                    {' · '}
                    <Link href={href} className="underline" target="_blank" rel="noopener">
                      Ouvrir le contenu
                    </Link>
                  </>
                ) : null}
              </p>
              {report.state === 'OPEN' ? (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon="check"
                    disabled={pending}
                    onClick={() => decide(report, 'RESOLVED')}
                  >
                    Résoudre
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => decide(report, 'REJECTED')}
                  >
                    Rejeter (non fondé)
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    icon="eyeOff"
                    disabled={pending}
                    onClick={() => setHiding(report)}
                  >
                    Masquer le contenu
                  </Button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {hasMore ? (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={loadMore} pending={loading}>
            Voir plus
          </Button>
        </div>
      ) : null}

      <ConfirmSheet
        open={hiding !== null}
        onOpenChange={(open) => !open && setHiding(null)}
        title="Masquer le contenu signalé ?"
        description="Le contenu est archivé : il disparaît immédiatement du site. Un éditeur pourra le republier après vérification. Les autres signalements ouverts sur ce contenu sont clos."
        confirmLabel="Masquer le contenu"
        pending={pending}
        onConfirm={() => hiding && decide(hiding, 'RESOLVED', 'HIDE_CONTENT')}
      />
    </div>
  );
}
