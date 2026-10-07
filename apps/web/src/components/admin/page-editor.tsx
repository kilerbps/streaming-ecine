'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { staticPageInputSchema, type AdminStaticPage, type PublishCheck } from '@ecine/contracts';
import type { z } from 'zod';
import { FormError, TextField } from '@/components/ui/field';
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
import { MarkdownField } from './fields';
import { slugify } from './format';
import { panelPrimaryOp, PublishPanel } from './publish-panel';

type Values = z.input<typeof staticPageInputSchema>;
type Output = z.output<typeof staticPageInputSchema>;

function toValues(page: AdminStaticPage | null): Values {
  return { slug: page?.slug ?? '', title: page?.title ?? '', body: page?.body ?? '' };
}

/** Page statique (à propos, mentions légales, confidentialité…) : chaque enregistrement crée une nouvelle version. */
export function PageEditor({
  page,
  check,
}: {
  page: AdminStaticPage | null;
  check: PublishCheck | null;
}) {
  const id = page?.id ?? null;
  const draftKey = storageKeys.draft('page', id);
  const defaults = useMemo(() => toValues(page), [page]);
  const form = useForm<Values, unknown, Output>({
    resolver: zodResolver(staticPageInputSchema),
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
  const [slugTouched, setSlugTouched] = useState(id !== null);

  useAutosave(form.subscribe, draftKey);
  useUnsavedWarning(isDirty);
  const { draft, dismiss } = useInitialDraft<Values>(draftKey);
  const showDraft = draft && JSON.stringify(draft.values) !== JSON.stringify(defaults);
  const body = useWatch({ control, name: 'body' });
  const { submit, pending, formError } = useEditorSave({ kind: 'pages', id, form, draftKey });
  const titleField = register('title');
  const publishPrimary = page
    ? panelPrimaryOp({
        kind: 'pages',
        state: page.state,
        deleted: false,
        check,
        dirty: isDirty,
      }) !== null
    : false;

  return (
    <>
      <form onSubmit={submit} noValidate className={EDITOR_MAIN}>
        {showDraft ? (
          <DraftBanner
            draft={draft}
            onRestore={() => {
              reset(draft.values, { keepDefaultValues: true });
              dismiss();
            }}
            onDismiss={() => {
              clearDraft(draftKey);
              dismiss();
            }}
          />
        ) : null}
        <FormError message={formError} />
        <FormSection
          title="Page"
          description={
            page
              ? `Version actuelle : ${page.version}. Chaque enregistrement crée la version suivante.`
              : undefined
          }
        >
          <TextField
            label="Titre"
            error={errors.title?.message}
            {...titleField}
            onChange={(event) => {
              void titleField.onChange(event);
              if (!slugTouched)
                setValue('slug', slugify(event.target.value), { shouldDirty: true });
            }}
          />
          <TextField
            label="Adresse (slug)"
            help={
              id
                ? 'Attention : les pages légales ont des adresses fixes (confidentialite, mentions-legales, conditions-generales, cookies, a-propos).'
                : 'Proposée à partir du titre.'
            }
            error={errors.slug?.message}
            {...register('slug', { onChange: () => setSlugTouched(true) })}
          />
          <MarkdownField
            label="Texte"
            value={body}
            error={errors.body?.message}
            rows={24}
            textarea={register('body')}
          />
        </FormSection>
        <SaveBar
          dirty={isDirty}
          pending={pending}
          primary={!publishPrimary}
          label={id ? 'Enregistrer une nouvelle version' : 'Créer la page'}
        />
      </form>
      <aside className={EDITOR_ASIDE} aria-label="Publication">
        {page ? (
          <PublishPanel
            kind="pages"
            id={page.id}
            confirmText={page.title}
            state={page.state}
            publishAt={null}
            deleted={false}
            check={check}
            dirty={isDirty}
            publicHref={`/fr/${page.slug}`}
          />
        ) : null}
      </aside>
    </>
  );
}
