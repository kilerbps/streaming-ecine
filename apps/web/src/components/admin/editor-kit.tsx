'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { saveContentAction } from '@/server/actions/admin/content';
import { CONTENT, type ContentKind } from './config';
import { clearDraft, type StoredDraft } from './drafts';
import { formatShort } from './format';
import { useAdminAction, type ActionFailure } from './use-admin-action';

/** Grille des écrans d'édition : formulaire à gauche, panneaux (publication, vidéo) à droite sur PC. */
export const EDITOR_GRID =
  'grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_1fr] lg:items-start';
export const EDITOR_MAIN =
  'flex min-w-0 flex-col gap-6 lg:col-start-1 lg:row-span-2 lg:row-start-1';
export const EDITOR_ASIDE = 'flex min-w-0 flex-col gap-6 lg:col-start-2 lg:row-start-1';
export const EDITOR_ASIDE_EXTRA = 'flex min-w-0 flex-col gap-6 lg:col-start-2 lg:row-start-2';

/** Avertit avant de quitter la page avec des modifications non enregistrées. */
export function useUnsavedWarning(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
}

/** Reporte les erreurs de champs renvoyées par le serveur (mêmes chemins que le contrat). */
export function applyServerErrors<T extends FieldValues>(
  setError: UseFormReturn<T>['setError'],
  failure: ActionFailure,
): void {
  for (const [path, message] of Object.entries(failure.fieldErrors ?? {})) {
    setError(path as Path<T>, { type: 'server', message });
  }
  if (failure.code === 'conflict' && /slug/i.test(failure.error)) {
    setError('slug' as Path<T>, { type: 'server', message: failure.error });
  }
}

/** Enregistrement d'un contenu (création → redirection vers sa fiche) avec brouillon local effacé. */
export function useEditorSave<TValues extends FieldValues, TOutput extends FieldValues>({
  kind,
  id,
  form,
  draftKey,
  normalize,
}: {
  kind: ContentKind;
  id: string | null;
  form: UseFormReturn<TValues, unknown, TOutput>;
  draftKey: string;
  normalize?: (values: TOutput) => unknown;
}) {
  const router = useRouter();
  const { run, pending } = useAdminAction();
  const [formError, setFormError] = useState<string | null>(null);

  const submit = form.handleSubmit(
    (values) => {
      setFormError(null);
      run(() => saveContentAction(kind, id, normalize ? normalize(values) : values), {
        success: id ? 'Modifications enregistrées.' : 'Brouillon créé.',
        onSuccess: ({ id: savedId }) => {
          clearDraft(draftKey);
          if (!id) router.replace(`${CONTENT[kind].ui}/${savedId}`);
        },
        onError: (failure) => {
          applyServerErrors(form.setError, failure);
          setFormError(failure.error);
        },
      });
    },
    () => setFormError('Certaines informations sont à corriger : voir les champs signalés.'),
  );

  return { submit, pending, formError };
}

/** Proposition de restauration d'un brouillon local retrouvé à l'ouverture. */
export function DraftBanner<T>({
  draft,
  onRestore,
  onDismiss,
}: {
  draft: StoredDraft<T>;
  onRestore: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      className="flex flex-col gap-3 border-l-2 border-signal bg-surface-1 px-4 py-3 md:flex-row md:items-center md:justify-between"
    >
      <p className="text-sm">
        Un brouillon non enregistré du{' '}
        <time dateTime={draft.savedAt} suppressHydrationWarning>
          {formatShort(draft.savedAt)}
        </time>{' '}
        a été retrouvé sur cet appareil.
      </p>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="secondary" onClick={onRestore}>
          Restaurer le brouillon
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          Ignorer
        </Button>
      </div>
    </div>
  );
}

/** Barre d'enregistrement collée en bas du formulaire. */
export function SaveBar({
  dirty,
  pending,
  primary,
  label,
  disabled = false,
  note,
}: {
  dirty: boolean;
  pending: boolean;
  primary: boolean;
  label: string;
  disabled?: boolean;
  note?: string;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-bg px-4 py-3 md:-mx-0 md:px-0">
      <p className="text-sm text-muted" aria-live="polite">
        {note ??
          (dirty
            ? 'Modifications non enregistrées (brouillon conservé sur cet appareil).'
            : 'Tout est enregistré.')}
      </p>
      <Button
        type="submit"
        variant={primary ? 'primary' : 'secondary'}
        pending={pending}
        disabled={disabled}
      >
        {label}
      </Button>
    </div>
  );
}

/** Bloc de formulaire titré. */
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5 border border-border bg-surface-1 p-4 md:p-6">
      <div>
        <h2 className="font-serif text-xl">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
