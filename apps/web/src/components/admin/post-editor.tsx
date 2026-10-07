'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { postInputSchema, type AdminPost, type PublishCheck } from '@ecine/contracts';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormError, TextAreaField } from '@/components/ui/field';
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
import { CharCounter, DateTimeField } from './fields';
import { ImageUploadField, type AdminImage } from './image-upload-field';
import { panelPrimaryOp, PublishPanel } from './publish-panel';

type Values = z.input<typeof postInputSchema>;
type Output = z.output<typeof postInputSchema>;

const MAX_IMAGES = 10;

function toValues(post: AdminPost | null): Values {
  return {
    caption: post?.caption ?? '',
    imageIds: post?.images.map((i) => i.id) ?? [],
    pinnedUntil: post?.pinnedUntil ?? undefined,
  };
}

/** Publication du fil : légende, 1 à 10 images ordonnées (chacune avec texte alternatif), épinglage. */
export function PostEditor({
  post,
  check,
}: {
  post: AdminPost | null;
  check: PublishCheck | null;
}) {
  const id = post?.id ?? null;
  const draftKey = storageKeys.draft('post', id);
  const defaults = useMemo(() => toValues(post), [post]);
  const form = useForm<Values, unknown, Output>({
    resolver: zodResolver(postInputSchema),
    defaultValues: defaults,
    mode: 'onTouched',
  });
  const {
    register,
    control,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = form;
  const [media, setMedia] = useState<Record<string, AdminImage>>(() =>
    Object.fromEntries((post?.images ?? []).map((i) => [i.id, i])),
  );

  useAutosave(form.subscribe, draftKey, media);
  useUnsavedWarning(isDirty);
  const { draft, dismiss } = useInitialDraft<Values>(draftKey);
  const showDraft = draft && JSON.stringify(draft.values) !== JSON.stringify(defaults);
  const [imageIds, caption] = useWatch({ control, name: ['imageIds', 'caption'] });
  const ids = imageIds ?? [];
  const { submit, pending, formError } = useEditorSave({ kind: 'posts', id, form, draftKey });

  const setIds = (next: string[]) =>
    setValue('imageIds', next, { shouldDirty: true, shouldValidate: true });
  const remember = (image: AdminImage) => setMedia((m) => ({ ...m, [image.id]: image }));
  const moveImage = (from: number, to: number) => {
    const next = [...ids];
    const [moved] = next.splice(from, 1);
    if (moved) next.splice(to, 0, moved);
    setIds(next);
  };

  const deleted = post?.deletedAt != null;
  const publishPrimary = post
    ? panelPrimaryOp({ kind: 'posts', state: post.state, deleted, check, dirty: isDirty }) !== null
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
          <FormError message="Cette publication est dans la corbeille : restaurez-la pour la modifier." />
        ) : null}
        <FormError message={formError} />

        <FormSection title="Légende">
          <TextAreaField
            label="Texte de la publication"
            rows={5}
            help={
              <CharCounter
                value={caption}
                max={2200}
                hint="Texte simple ; les retours à la ligne sont conservés."
              />
            }
            error={errors.caption?.message}
            {...register('caption')}
          />
        </FormSection>

        <FormSection
          title={`Images (${ids.length}/${MAX_IMAGES})`}
          description="La première image sert de vignette dans le fil. Chaque image doit être décrite."
        >
          {errors.imageIds?.message ? (
            <p className="text-sm text-danger" role="alert">
              {errors.imageIds.message}
            </p>
          ) : null}
          <ol className="flex flex-col gap-4">
            {ids.map((imageId, index) => (
              <li key={imageId} className="flex flex-col gap-3 border border-border bg-bg p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="meta">Image n° {index + 1}</span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="arrowUp"
                      aria-label={`Monter l’image n° ${index + 1}`}
                      disabled={index === 0}
                      onClick={() => moveImage(index, index - 1)}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="arrowDown"
                      aria-label={`Descendre l’image n° ${index + 1}`}
                      disabled={index === ids.length - 1}
                      onClick={() => moveImage(index, index + 1)}
                    />
                  </div>
                </div>
                <ImageUploadField
                  label={`Image n° ${index + 1}`}
                  ratio="4/5"
                  value={media[imageId] ?? null}
                  error={errors.imageIds?.[index]?.message}
                  onChange={(image) => {
                    if (!image) {
                      setIds(ids.filter((_, i) => i !== index));
                      return;
                    }
                    remember(image);
                    setIds(ids.map((current, i) => (i === index ? image.id : current)));
                  }}
                />
              </li>
            ))}
          </ol>
          {ids.length < MAX_IMAGES ? (
            <div className="border-t border-border pt-4">
              <ImageUploadField
                key={ids.length}
                label="Ajouter une image"
                ratio="4/5"
                value={null}
                help="JPEG, PNG, WebP ou AVIF · 4 Mo au plus."
                onChange={(image) => {
                  if (!image) return;
                  remember(image);
                  setIds([...ids, image.id]);
                }}
              />
            </div>
          ) : (
            <p className="text-sm text-muted">Nombre maximal d’images atteint.</p>
          )}
        </FormSection>

        <FormSection
          title="Épinglage"
          description="Une publication épinglée reste en tête du fil jusqu’à la date choisie."
        >
          <Controller
            control={control}
            name="pinnedUntil"
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-2 md:max-w-sm">
                <DateTimeField
                  label="Épinglée jusqu’au"
                  optional
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
                {field.value ? (
                  <div>
                    <Button size="sm" variant="ghost" onClick={() => field.onChange(undefined)}>
                      Ne plus épingler
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          />
        </FormSection>

        <SaveBar
          dirty={isDirty}
          pending={pending}
          primary={!publishPrimary && !deleted}
          label={id ? 'Enregistrer' : 'Créer le brouillon'}
          disabled={deleted}
        />
      </form>

      <aside className={EDITOR_ASIDE} aria-label="Publication">
        {post ? (
          <PublishPanel
            kind="posts"
            id={post.id}
            confirmText="supprimer"
            state={post.state}
            publishAt={post.publishAt}
            deleted={deleted}
            check={check}
            dirty={isDirty}
            publicHref={`/fr/publications/${post.id}`}
          />
        ) : (
          <section className="border border-border bg-surface-1 p-4 text-sm text-muted md:p-5">
            <h2 className="font-serif text-xl text-text">Avant de créer</h2>
            <p className="mt-3">Ajoutez au moins une image (avec sa description) et une légende.</p>
          </section>
        )}
      </aside>
    </>
  );
}
