'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { teamMemberInputSchema, type AdminTeamMember } from '@ecine/contracts';
import type { z } from 'zod';
import { Poster } from '@/components/features/content/poster';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { CheckboxField, FormError, TextAreaField, TextField } from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';
import {
  deleteTeamMemberAction,
  reorderTeamAction,
  saveTeamMemberAction,
} from '@/server/actions/admin/site';
import { Badge } from './badges';
import { ConfirmSheet } from './confirm-sheet';
import { applyServerErrors } from './editor-kit';
import { ImageUploadField, type AdminImage } from './image-upload-field';
import { useAdminAction } from './use-admin-action';

type Values = z.input<typeof teamMemberInputSchema>;
type Output = z.output<typeof teamMemberInputSchema>;
type TeamInput = z.output<typeof teamMemberInputSchema>;

function toInput(member: AdminTeamMember, overrides: Partial<TeamInput> = {}): TeamInput {
  return {
    name: member.name,
    title: member.title,
    bio: member.bio ?? undefined,
    photoId: member.photo?.id,
    position: member.position,
    visible: member.visible,
    ...overrides,
  };
}

function MemberForm({
  member,
  nextPosition,
  onDone,
}: {
  member: AdminTeamMember | null;
  nextPosition: number;
  onDone: () => void;
}) {
  const { run, pending } = useAdminAction();
  const [formError, setFormError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<AdminImage | null>(member?.photo ?? null);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<Values, unknown, Output>({
    resolver: zodResolver(teamMemberInputSchema),
    defaultValues: member
      ? toInput(member)
      : { name: '', title: '', bio: '', position: nextPosition, visible: true },
  });
  const visible = useWatch({ control, name: 'visible' });

  const submit = handleSubmit((values) => {
    setFormError(null);
    run(() => saveTeamMemberAction(member?.id ?? null, values), {
      success: member ? 'Fiche modifiée.' : 'Membre ajouté.',
      onSuccess: onDone,
      onError: (failure) => {
        applyServerErrors(setError, failure);
        setFormError(failure.error);
      },
    });
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <FormError message={formError} />
      <TextField label="Nom" error={errors.name?.message} {...register('name')} />
      <TextField
        label="Fonction"
        placeholder="Ex. : Directrice des études"
        error={errors.title?.message}
        {...register('title')}
      />
      <TextAreaField
        label="Présentation"
        optional
        rows={4}
        error={errors.bio?.message}
        {...register('bio')}
      />
      <ImageUploadField
        label="Photo"
        ratio="4/5"
        value={photo}
        error={errors.photoId?.message}
        help={visible ? 'Un texte alternatif est exigé pour un membre visible.' : undefined}
        onChange={(image) => {
          setPhoto(image);
          setValue('photoId', image?.id, { shouldDirty: true });
        }}
      />
      <CheckboxField label="Visible sur la page « À propos »" {...register('visible')} />
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onDone}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" pending={pending}>
          {member ? 'Enregistrer' : 'Ajouter'}
        </Button>
      </div>
    </form>
  );
}

/** Équipe dirigeante (page « À propos ») : ordre d'affichage, visibilité, photo. */
export function TeamManager({ members }: { members: AdminTeamMember[] }) {
  const { run, pending } = useAdminAction();
  const [editing, setEditing] = useState<AdminTeamMember | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminTeamMember | null>(null);
  const nextPosition = members.reduce((max, m) => Math.max(max, m.position), -10) + 10;

  /** Déplace un membre puis renumérote (0, 10, 20…) ; seuls les membres dont la position change sont envoyés. */
  const move = (from: number, to: number) => {
    const order = [...members];
    const [moved] = order.splice(from, 1);
    if (!moved) return;
    order.splice(to, 0, moved);
    const updates = order
      .map((member, index) => ({ member, position: index * 10 }))
      .filter(({ member, position }) => member.position !== position)
      .map(({ member, position }) => ({ id: member.id, input: toInput(member, { position }) }));
    if (updates.length === 0) return;
    run(() => reorderTeamAction(updates), { success: 'Ordre mis à jour.' });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button variant="primary" icon="plus" onClick={() => setEditing('new')}>
          Ajouter un membre
        </Button>
      </div>
      {members.length === 0 ? (
        <EmptyState title="Aucun membre de l’équipe">
          Ajoutez la direction et les responsables présentés sur la page « À propos ».
        </EmptyState>
      ) : (
        <ol className="flex flex-col border border-border">
          {members.map((member, index) => (
            <li
              key={member.id}
              className="grid grid-cols-[56px_minmax(0,1fr)] gap-4 border-b border-border p-3 last:border-b-0 md:grid-cols-[56px_minmax(0,1fr)_auto] md:items-center"
            >
              <div className="w-14">
                <Poster image={member.photo} ratio="4/5" sizes="56px" />
              </div>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {member.name}
                  {member.visible ? (
                    <Badge tone="success">Visible</Badge>
                  ) : (
                    <Badge tone="muted">Masqué</Badge>
                  )}
                </p>
                <p className="text-sm text-muted">{member.title}</p>
                <p className="meta mt-1">Position {index + 1}</p>
              </div>
              <div className="col-span-2 flex flex-wrap gap-1 md:col-span-1 md:justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  icon="arrowUp"
                  aria-label={`Monter ${member.name}`}
                  disabled={index === 0 || pending}
                  onClick={() => move(index, index - 1)}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  icon="arrowDown"
                  aria-label={`Descendre ${member.name}`}
                  disabled={index === members.length - 1 || pending}
                  onClick={() => move(index, index + 1)}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  icon={member.visible ? 'eyeOff' : 'eye'}
                  disabled={pending}
                  onClick={() =>
                    run(
                      () =>
                        saveTeamMemberAction(
                          member.id,
                          toInput(member, { visible: !member.visible }),
                        ),
                      {
                        success: member.visible ? 'Membre masqué.' : 'Membre visible sur le site.',
                      },
                    )
                  }
                >
                  {member.visible ? 'Masquer' : 'Afficher'}
                </Button>
                <Button size="sm" variant="ghost" icon="edit" onClick={() => setEditing(member)}>
                  Modifier
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon="trash"
                  aria-label={`Supprimer ${member.name}`}
                  onClick={() => setDeleting(member)}
                />
              </div>
            </li>
          ))}
        </ol>
      )}

      <Sheet
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing === 'new' ? 'Nouveau membre' : 'Modifier le membre'}
      >
        {editing ? (
          <MemberForm
            key={editing === 'new' ? 'new' : editing.id}
            member={editing === 'new' ? null : editing}
            nextPosition={nextPosition}
            onDone={() => setEditing(null)}
          />
        ) : null}
      </Sheet>

      <ConfirmSheet
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Retirer ce membre de l’équipe ?"
        description="Suppression définitive : la fiche disparaît de la page « À propos »."
        confirmLabel="Supprimer"
        typeToConfirm={deleting?.name}
        pending={pending}
        onConfirm={() => {
          if (!deleting) return;
          run(() => deleteTeamMemberAction(deleting.id), {
            success: 'Membre supprimé.',
            onSuccess: () => setDeleting(null),
          });
        }}
      />
    </div>
  );
}
