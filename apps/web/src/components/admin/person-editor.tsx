'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { personInputSchema, type AdminPerson, type PublishCheck } from '@ecine/contracts';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormError, TextAreaField, TextField } from '@/components/ui/field';
import { storageKeys } from './config';
import { clearDraft, useAutosave, useInitialDraft } from './drafts';
import {
  DraftBanner,
  EDITOR_ASIDE,
  EDITOR_MAIN,
  FormSection,
  SaveBar,
  useEditorSave,
  useUnsavedWarning,
} from './editor-kit';
import { emptyToUndefined, optionalInt } from './fields';
import { slugify } from './format';
import { ImageUploadField, type AdminImage } from './image-upload-field';
import { SOCIAL_FIELDS } from './labels';
import { panelPrimaryOp, PublishPanel } from './publish-panel';

type Values = z.input<typeof personInputSchema>;
type Output = z.output<typeof personInputSchema>;

function toValues(person: AdminPerson | null): Values {
  return {
    slug: person?.slug ?? '',
    name: person?.name ?? '',
    bio: person?.bio ?? '',
    birthYear: person?.birthYear ?? undefined,
    photoId: person?.photo?.id ?? undefined,
    socials: { ...(person?.socials ?? {}) },
  };
}

/** Fiche personne (acteur·rice, réalisateur·rice, équipe) : nom, biographie, photo, réseaux. */
export function PersonEditor({
  person,
  check,
}: {
  person: AdminPerson | null;
  check: PublishCheck | null;
}) {
  const id = person?.id ?? null;
  const draftKey = storageKeys.draft('person', id);
  const defaults = useMemo(() => toValues(person), [person]);
  const form = useForm<Values, unknown, Output>({
    resolver: zodResolver(personInputSchema),
    defaultValues: defaults,
    mode: 'onTouched',
  });
  const {
    register,
    control,
    setValue,
    getValues,
    reset,
    formState: { errors, isDirty },
  } = form;
  const [media, setMedia] = useState<Record<string, AdminImage>>(() =>
    person?.photo ? { [person.photo.id]: person.photo } : {},
  );
  const [slugTouched, setSlugTouched] = useState(id !== null);

  useAutosave(form.subscribe, draftKey, media);
  useUnsavedWarning(isDirty);
  const { draft, dismiss } = useInitialDraft<Values>(draftKey);
  const showDraft = draft && JSON.stringify(draft.values) !== JSON.stringify(defaults);
  const photoId = useWatch({ control, name: 'photoId' });
  const photo = photoId ? (media[photoId] ?? null) : null;
  const { submit, pending, formError } = useEditorSave({ kind: 'people', id, form, draftKey });

  const nameField = register('name');
  const deleted = person?.deletedAt != null;
  const publishPrimary = person
    ? panelPrimaryOp({ kind: 'people', state: person.state, deleted, check, dirty: isDirty }) !==
      null
    : false;

  return (
    <>
      <form onSubmit={submit} noValidate className={EDITOR_MAIN}>
        {showDraft ? (
          <DraftBanner
            draft={draft}
            onRestore={() => {
              if (draft.extra && typeof draft.extra === 'object')
                setMedia((m) => ({ ...(draft.extra as Record<string, AdminImage>), ...m }));
              reset(draft.values, { keepDefaultValues: true });
              dismiss();
            }}
            onDismiss={() => {
              clearDraft(draftKey);
              dismiss();
            }}
          />
        ) : null}
        {deleted ? (
          <FormError message="Cette fiche est dans la corbeille : restaurez-la pour la modifier." />
        ) : null}
        <FormError message={formError} />

        <FormSection title="Identité">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_160px]">
            <TextField
              label="Nom"
              autoComplete="off"
              error={errors.name?.message}
              {...nameField}
              onChange={(event) => {
                void nameField.onChange(event);
                if (!slugTouched)
                  setValue('slug', slugify(event.target.value), { shouldDirty: true });
              }}
            />
            <TextField
              label="Année de naissance"
              optional
              type="number"
              inputMode="numeric"
              min={1900}
              max={2100}
              error={errors.birthYear?.message}
              {...register('birthYear', { setValueAs: optionalInt })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <TextField
              label="Adresse (slug)"
              help={
                id
                  ? 'La modifier crée automatiquement une redirection depuis l’ancienne adresse.'
                  : 'Proposée à partir du nom.'
              }
              error={errors.slug?.message}
              {...register('slug', { onChange: () => setSlugTouched(true) })}
            />
            <div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setValue('slug', slugify(getValues('name')), {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              >
                Proposer depuis le nom
              </Button>
            </div>
          </div>
          <TextAreaField
            label="Biographie"
            optional
            rows={8}
            help="Texte simple ; laissez une ligne vide entre deux paragraphes."
            error={errors.bio?.message}
            {...register('bio')}
          />
        </FormSection>

        <FormSection title="Photo" description="Portrait sur fond uni de préférence, sans filtre.">
          <ImageUploadField
            label="Photo de la personne"
            ratio="4/5"
            value={photo}
            error={errors.photoId?.message}
            help="JPEG, PNG, WebP ou AVIF · 4 Mo au plus."
            onChange={(image) => {
              if (image) setMedia((m) => ({ ...m, [image.id]: image }));
              setValue('photoId', image?.id, { shouldDirty: true, shouldValidate: true });
            }}
          />
        </FormSection>

        <FormSection
          title="Réseaux sociaux"
          description="Adresses complètes commençant par https://."
        >
          <div className="grid gap-5 md:grid-cols-2">
            {SOCIAL_FIELDS.map(([key, label]) => (
              <TextField
                key={key}
                label={label}
                optional
                type="url"
                inputMode="url"
                placeholder="https://…"
                error={errors.socials?.[key]?.message}
                {...register(`socials.${key}`, { setValueAs: emptyToUndefined })}
              />
            ))}
          </div>
        </FormSection>

        <SaveBar
          dirty={isDirty}
          pending={pending}
          primary={!publishPrimary && !deleted}
          label={id ? 'Enregistrer' : 'Créer la fiche'}
          disabled={deleted}
        />
      </form>

      <aside className={EDITOR_ASIDE} aria-label="Publication">
        {person ? (
          <PublishPanel
            kind="people"
            id={person.id}
            confirmText={person.name}
            state={person.state}
            publishAt={null}
            deleted={deleted}
            check={check}
            dirty={isDirty}
            publicHref={`/fr/personnes/${person.slug}`}
          />
        ) : (
          <section className="border border-border bg-surface-1 p-4 text-sm text-muted md:p-5">
            <h2 className="font-serif text-xl text-text">Après la création</h2>
            <p className="mt-3">
              Publiez la fiche, puis créditez la personne depuis l’écran d’un film (section «
              Générique »).
            </p>
          </section>
        )}
      </aside>
    </>
  );
}
