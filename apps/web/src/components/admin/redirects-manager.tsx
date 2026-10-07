'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { redirectInputSchema, type Page, type Redirect } from '@ecine/contracts';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FormError, TextField } from '@/components/ui/field';
import {
  createRedirectAction,
  deleteRedirectAction,
  loadRedirectsAction,
} from '@/server/actions/admin/site';
import { ConfirmSheet } from './confirm-sheet';
import { applyServerErrors } from './editor-kit';
import { SelectField } from './fields';
import { useAdminAction } from './use-admin-action';
import { useCursorList } from './use-cursor-list';

type Values = z.input<typeof redirectInputSchema>;
type Output = z.output<typeof redirectInputSchema>;

const STATUS_LABELS: Record<number, string> = {
  301: '301 · définitive',
  308: '308 · définitive (méthode conservée)',
  302: '302 · temporaire',
};

/**
 * Redirections : anciennes adresses → nouvelles. Celles des changements de slug sont créées
 * automatiquement ; on ajoute ici les cas particuliers (ancien site, liens imprimés…).
 */
export function RedirectsManager({ initial, q }: { initial: Page<Redirect>; q?: string }) {
  const {
    items,
    hasMore,
    loadMore,
    pending: loading,
  } = useCursorList(initial, (cursor) => loadRedirectsAction({ q, cursor }));
  const { run, pending } = useAdminAction();
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Redirect | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Values, unknown, Output>({
    resolver: zodResolver(redirectInputSchema),
    defaultValues: { fromPath: '', toPath: '', status: 301 },
  });

  const submit = handleSubmit((values) => {
    setFormError(null);
    run(() => createRedirectAction(values), {
      success: 'Redirection ajoutée.',
      onSuccess: () => reset({ fromPath: '', toPath: '', status: 301 }),
      onError: (failure) => {
        applyServerErrors(setError, failure);
        setFormError(failure.error);
      },
    });
  });

  return (
    <div className="flex flex-col gap-6">
      <section className="border border-border bg-surface-1 p-4 md:p-6">
        <h2 className="font-serif text-xl">Nouvelle redirection</h2>
        <p className="mt-1 text-sm text-muted">
          Chemins internes uniquement, commençant par / (ex. : /fr/films/ancien-titre).
        </p>
        <form onSubmit={submit} noValidate className="mt-4 flex flex-col gap-4">
          <FormError message={formError} />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px]">
            <TextField
              label="Ancienne adresse"
              placeholder="/fr/…"
              autoComplete="off"
              error={errors.fromPath?.message}
              {...register('fromPath')}
            />
            <TextField
              label="Nouvelle adresse"
              placeholder="/fr/…"
              autoComplete="off"
              error={errors.toPath?.message}
              {...register('toPath')}
            />
            <SelectField
              label="Type"
              error={errors.status?.message}
              {...register('status', { setValueAs: (v) => Number(v) })}
            >
              {[301, 308, 302].map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </SelectField>
          </div>
          <div>
            <Button type="submit" variant="primary" icon="plus" pending={pending}>
              Ajouter la redirection
            </Button>
          </div>
        </form>
      </section>

      {items.length === 0 ? (
        <EmptyState title={q ? 'Aucune redirection pour cette recherche' : 'Aucune redirection'}>
          Les changements d’adresse des films, personnes et actualités créent leurs redirections
          automatiquement.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-1">
              <tr className="border-b border-border">
                <th scope="col" className="eyebrow px-4 py-3 font-normal text-muted">
                  Ancienne adresse
                </th>
                <th scope="col" className="eyebrow px-4 py-3 font-normal text-muted">
                  Nouvelle adresse
                </th>
                <th
                  scope="col"
                  className="eyebrow hidden px-4 py-3 font-normal text-muted md:table-cell"
                >
                  Type
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 font-mono text-xs break-all">{r.fromPath}</td>
                  <td className="px-4 py-3 font-mono text-xs break-all">{r.toPath}</td>
                  <td className="hidden px-4 py-3 font-mono text-xs md:table-cell">{r.status}</td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="trash"
                      aria-label={`Supprimer la redirection ${r.fromPath}`}
                      onClick={() => setDeleting(r)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {hasMore ? (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={loadMore} pending={loading}>
            Voir plus
          </Button>
        </div>
      ) : null}

      <ConfirmSheet
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Supprimer cette redirection ?"
        description={
          deleting
            ? `${deleting.fromPath} ne redirigera plus vers ${deleting.toPath} : les anciens liens afficheront une page introuvable.`
            : undefined
        }
        confirmLabel="Supprimer"
        pending={pending}
        onConfirm={() => {
          if (!deleting) return;
          run(() => deleteRedirectAction(deleting.id), {
            success: 'Redirection supprimée.',
            onSuccess: () => setDeleting(null),
          });
        }}
      />
    </div>
  );
}
