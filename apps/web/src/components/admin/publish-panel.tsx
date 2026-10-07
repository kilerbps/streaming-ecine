'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { PublishCheck, PublishState } from '@ecine/contracts';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Sheet } from '@/components/ui/sheet';
import { changeStateAction } from '@/server/actions/admin/content';
import { StateBadge } from './badges';
import { CONTENT, type ContentKind, type ContentOp } from './config';
import { ConfirmSheet } from './confirm-sheet';
import { DateTimeField } from './fields';
import { formatShort } from './format';
import { useAdminAction } from './use-admin-action';

const SUCCESS: Record<ContentOp, string> = {
  publish: 'Publié : le contenu est en ligne.',
  schedule: 'Publication planifiée.',
  unpublish: 'Retiré du site (brouillon).',
  archive: 'Archivé : le contenu ne s’affiche plus sur le site.',
  delete: 'Mis à la corbeille. Vous pouvez le restaurer.',
  restore: 'Restauré en brouillon.',
};

/** Proposition de date : demain, à l'heure pile (appelée au clic, jamais pendant le rendu). */
function defaultScheduleDate(): string {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  tomorrow.setUTCMinutes(0, 0, 0);
  return tomorrow.toISOString();
}

/** Actions proposées selon l'état (filtrées par celles que le type de contenu permet). */
function opsFor(state: PublishState, deleted: boolean, allowed: readonly ContentOp[]): ContentOp[] {
  const byState: Record<PublishState, ContentOp[]> = {
    DRAFT: ['publish', 'schedule', 'delete'],
    SCHEDULED: ['publish', 'schedule', 'unpublish', 'delete'],
    PUBLISHED: ['unpublish', 'archive', 'delete'],
    ARCHIVED: ['publish', 'unpublish', 'delete'],
  };
  const ops = deleted ? ['restore' as const] : byState[state];
  return ops.filter((op) => allowed.includes(op));
}

function label(op: ContentOp, state: PublishState): string {
  switch (op) {
    case 'publish':
      return state === 'SCHEDULED'
        ? 'Publier maintenant'
        : state === 'ARCHIVED'
          ? 'Republier'
          : 'Publier';
    case 'schedule':
      return state === 'SCHEDULED' ? 'Changer la date' : 'Planifier';
    case 'unpublish':
      return state === 'SCHEDULED'
        ? 'Annuler la planification'
        : state === 'ARCHIVED'
          ? 'Repasser en brouillon'
          : 'Dépublier';
    case 'archive':
      return 'Archiver';
    case 'delete':
      return 'Supprimer';
    case 'restore':
      return 'Restaurer';
  }
}

/**
 * Action principale du panneau (null : c'est « Enregistrer » qui est le CTA principal de l'écran).
 * Partagée avec les éditeurs pour garantir un seul bouton principal par vue.
 */
export function panelPrimaryOp({
  kind,
  state,
  deleted,
  check,
  dirty,
}: {
  kind: ContentKind;
  state: PublishState;
  deleted: boolean;
  check: PublishCheck | null;
  dirty: boolean;
}): ContentOp | null {
  if (deleted) return CONTENT[kind].ops.includes('restore') ? 'restore' : null;
  const ops = opsFor(state, false, CONTENT[kind].ops);
  return !dirty && (check?.ok ?? true) && state !== 'PUBLISHED' && ops.includes('publish')
    ? 'publish'
    : null;
}

/**
 * Panneau « Publication » d'un éditeur : état, contrôles avant publication (liste de ce qui manque),
 * puis les actions d'état. Un seul CTA principal : « Publier » (ou « Restaurer ») seulement quand le
 * formulaire est enregistré ; sinon c'est « Enregistrer » qui est principal.
 */
export function PublishPanel({
  kind,
  id,
  confirmText,
  state,
  publishAt,
  deleted,
  check,
  dirty,
  publicHref,
}: {
  kind: ContentKind;
  id: string;
  /** Texte à recopier pour confirmer la suppression (titre, nom…). */
  confirmText: string;
  state: PublishState;
  publishAt: string | null;
  deleted: boolean;
  check: PublishCheck | null;
  dirty: boolean;
  publicHref: string | null;
}) {
  const { run, pending } = useAdminAction();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState<string | undefined>(undefined);
  const [scheduleError, setScheduleError] = useState<string | undefined>(undefined);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const ops = opsFor(state, deleted, CONTENT[kind].ops);
  const ready = check?.ok ?? true;
  const primaryOp = panelPrimaryOp({ kind, state, deleted, check, dirty });

  const apply = (op: ContentOp, at?: string) =>
    run(() => changeStateAction(kind, id, op, at), {
      success: SUCCESS[op],
      onSuccess: () => {
        setScheduleOpen(false);
        setDeleteOpen(false);
      },
      onError: (failure) => {
        if (op === 'schedule') setScheduleError(failure.fieldErrors?.publishAt ?? failure.error);
      },
    });

  const openSchedule = () => {
    setScheduleAt(publishAt && state === 'SCHEDULED' ? publishAt : defaultScheduleDate());
    setScheduleError(undefined);
    setScheduleOpen(true);
  };

  const needsCleanForm = (op: ContentOp) => (op === 'publish' || op === 'schedule') && dirty;

  return (
    <section
      className="border border-border bg-surface-1 p-4 md:p-5"
      aria-labelledby={`publication-${id}`}
    >
      <h2 id={`publication-${id}`} className="font-serif text-xl">
        Publication
      </h2>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StateBadge state={state} deleted={deleted} />
        {state === 'SCHEDULED' && publishAt && !deleted ? (
          <span className="text-sm text-muted">
            le{' '}
            <time dateTime={publishAt} suppressHydrationWarning>
              {formatShort(publishAt)}
            </time>
          </span>
        ) : null}
      </div>
      {publicHref && state === 'PUBLISHED' && !deleted ? (
        <Link
          href={publicHref}
          className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm underline"
          target="_blank"
          rel="noopener"
        >
          <Icon name="external" size={18} />
          Voir sur le site
        </Link>
      ) : null}

      {check && !deleted ? (
        <div className="mt-5 border-t border-border pt-4">
          <h3 className="text-sm font-medium">Contrôles avant publication</h3>
          {check.ok ? (
            <p className="mt-2 flex items-start gap-2 text-sm text-success">
              <Icon name="check" size={18} className="mt-0.5 shrink-0" />
              Tout est prêt pour la publication.
            </p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2 text-sm">
              {check.missing.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Icon name="alert" size={18} className="mt-0.5 shrink-0 text-highlight" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
          {dirty ? (
            <p className="mt-3 text-sm text-muted">
              Les contrôles portent sur la version enregistrée : enregistrez d’abord vos
              modifications.
            </p>
          ) : null}
        </div>
      ) : null}

      {ops.length > 0 ? (
        <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4">
          {ops.map((op) => (
            <Button
              key={op}
              variant={op === primaryOp ? 'primary' : op === 'delete' ? 'danger' : 'secondary'}
              icon={
                op === 'delete'
                  ? 'trash'
                  : op === 'schedule'
                    ? 'calendar'
                    : op === 'archive'
                      ? 'archive'
                      : op === 'restore'
                        ? 'refresh'
                        : undefined
              }
              disabled={needsCleanForm(op) || (op === 'publish' && !ready)}
              pending={pending}
              className="w-full"
              onClick={() => {
                if (op === 'schedule') openSchedule();
                else if (op === 'delete') setDeleteOpen(true);
                else apply(op);
              }}
            >
              {label(op, state)}
            </Button>
          ))}
          {!ready && ops.includes('publish') ? (
            <p className="text-sm text-muted">
              Complétez les éléments ci-dessus pour pouvoir publier.
            </p>
          ) : null}
        </div>
      ) : null}

      <Sheet
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        title="Planifier la publication"
        description="Le contenu sera mis en ligne automatiquement à la date choisie."
      >
        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!scheduleAt) {
              setScheduleError('Choisissez une date et une heure.');
              return;
            }
            apply('schedule', scheduleAt);
          }}
        >
          <DateTimeField
            label="Date et heure de publication"
            value={scheduleAt}
            onChange={setScheduleAt}
            error={scheduleError}
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setScheduleOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" icon="calendar" pending={pending}>
              Planifier
            </Button>
          </div>
        </form>
      </Sheet>

      <ConfirmSheet
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Supprimer ce contenu ?"
        description="Il quitte immédiatement le site et part dans la corbeille. Vous pourrez le restaurer (il reviendra en brouillon)."
        confirmLabel="Supprimer"
        typeToConfirm={confirmText}
        pending={pending}
        onConfirm={() => apply('delete')}
      />
    </section>
  );
}
