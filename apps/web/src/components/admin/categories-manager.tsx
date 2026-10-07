'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { categoryInputSchema, type AdminCategory } from '@ecine/contracts';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FormError, TextField } from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';
import { deleteCategoryAction, saveCategoryAction } from '@/server/actions/admin/site';
import { ConfirmSheet } from './confirm-sheet';
import { applyServerErrors } from './editor-kit';
import { slugify } from './format';
import { useAdminAction } from './use-admin-action';

type Values = z.input<typeof categoryInputSchema>;
type Output = z.output<typeof categoryInputSchema>;

/** Formulaire de catégorie (création en ligne ou modification dans une feuille). */
function CategoryForm({
  category,
  primary,
  onDone,
}: {
  category: AdminCategory | null;
  primary: boolean;
  onDone?: () => void;
}) {
  const { run, pending } = useAdminAction();
  const [formError, setFormError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(category !== null);
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<Values, unknown, Output>({
    resolver: zodResolver(categoryInputSchema),
    defaultValues: { name: category?.name ?? '', slug: category?.slug ?? '' },
  });
  const nameField = register('name');

  const submit = handleSubmit((values) => {
    setFormError(null);
    run(() => saveCategoryAction(category?.id ?? null, values), {
      success: category ? 'Catégorie modifiée.' : 'Catégorie ajoutée.',
      onSuccess: () => {
        if (!category) {
          reset({ name: '', slug: '' });
          setSlugTouched(false);
        }
        onDone?.();
      },
      onError: (failure) => {
        applyServerErrors(setError, failure);
        setFormError(failure.error);
      },
    });
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <FormError message={formError} />
      <div
        className={
          category
            ? 'flex flex-col gap-4'
            : 'grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-start'
        }
      >
        <TextField
          label="Nom"
          error={errors.name?.message}
          {...nameField}
          onChange={(event) => {
            void nameField.onChange(event);
            if (!slugTouched) setValue('slug', slugify(event.target.value));
          }}
        />
        <TextField
          label="Adresse (slug)"
          help={
            category ? 'La modifier crée une redirection depuis l’ancienne adresse.' : undefined
          }
          error={errors.slug?.message}
          {...register('slug', { onChange: () => setSlugTouched(true) })}
        />
        <div className={category ? 'flex justify-end' : 'md:pt-7'}>
          <Button
            type="submit"
            variant={primary ? 'primary' : 'secondary'}
            icon={category ? undefined : 'plus'}
            pending={pending}
          >
            {category ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </div>
      </div>
    </form>
  );
}

/** Catégories du catalogue : ajout, renommage, suppression (seulement si aucun film ne l'utilise). */
export function CategoriesManager({ categories }: { categories: AdminCategory[] }) {
  const { run, pending } = useAdminAction();
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [deleting, setDeleting] = useState<AdminCategory | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <section className="border border-border bg-surface-1 p-4 md:p-6">
        <h2 className="mb-4 font-serif text-xl">Nouvelle catégorie</h2>
        <CategoryForm category={null} primary />
      </section>

      {categories.length === 0 ? (
        <EmptyState title="Aucune catégorie">
          Ajoutez les genres du catalogue (drame, comédie, documentaire…).
        </EmptyState>
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-1">
              <tr className="border-b border-border">
                <th scope="col" className="eyebrow px-4 py-3 font-normal text-muted">
                  Nom
                </th>
                <th
                  scope="col"
                  className="eyebrow hidden px-4 py-3 font-normal text-muted sm:table-cell"
                >
                  Adresse
                </th>
                <th scope="col" className="eyebrow px-4 py-3 font-normal text-muted">
                  Films
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 font-medium">{category.name}</td>
                  <td className="meta hidden px-4 py-3 normal-case sm:table-cell">
                    /{category.slug}
                  </td>
                  <td className="px-4 py-3 font-mono">{category.filmCount}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="edit"
                        onClick={() => setEditing(category)}
                      >
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="trash"
                        aria-label={`Supprimer ${category.name}`}
                        title={
                          category.filmCount > 0
                            ? 'Retirez d’abord cette catégorie des films concernés'
                            : undefined
                        }
                        disabled={category.filmCount > 0}
                        onClick={() => setDeleting(category)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Modifier la catégorie"
      >
        {editing ? (
          <CategoryForm
            key={editing.id}
            category={editing}
            primary
            onDone={() => setEditing(null)}
          />
        ) : null}
      </Sheet>

      <ConfirmSheet
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Supprimer la catégorie ?"
        description="Suppression définitive. Elle n’est possible que si aucun film n’utilise cette catégorie."
        confirmLabel="Supprimer"
        typeToConfirm={deleting?.name}
        pending={pending}
        onConfirm={() => {
          if (!deleting) return;
          run(() => deleteCategoryAction(deleting.id), {
            success: 'Catégorie supprimée.',
            onSuccess: () => setDeleting(null),
          });
        }}
      />
    </div>
  );
}
