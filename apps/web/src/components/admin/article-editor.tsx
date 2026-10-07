'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  articleInputSchema,
  articleKindSchema,
  type AdminArticle,
  type PublishCheck,
} from '@ecine/contracts';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormError, TextAreaField, TextField } from '@/components/ui/field';
import { searchFilmsAction } from '@/server/actions/admin/content';
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
import { CharCounter, DateTimeField, MarkdownField, SelectField } from './fields';
import { slugify } from './format';
import { ImageUploadField, type AdminImage } from './image-upload-field';
import { ARTICLE_KIND_LABELS } from './labels';
import { panelPrimaryOp, PublishPanel } from './publish-panel';
import { SearchPicker } from './search-picker';

type Values = z.input<typeof articleInputSchema>;
type Output = z.output<typeof articleInputSchema>;
interface Extra {
  media?: Record<string, AdminImage>;
  films?: Record<string, string>;
}

function toValues(article: AdminArticle | null): Values {
  return {
    slug: article?.slug ?? '',
    kind: article?.kind ?? 'NEWS',
    title: article?.title ?? '',
    excerpt: article?.excerpt ?? '',
    body: article?.body ?? '',
    coverId: article?.cover?.id ?? undefined,
    eventStart: article?.eventStart ?? undefined,
    eventPlace: article?.eventPlace ?? '',
    featuredFilmId: article?.featuredFilmId ?? undefined,
    seoTitle: article?.seoTitle ?? '',
    seoDescription: article?.seoDescription ?? '',
  };
}

/** Actualité, annonce ou événement : texte en Markdown restreint avec aperçu, couverture, film lié, SEO. */
export function ArticleEditor({
  article,
  featuredFilm,
  check,
}: {
  article: AdminArticle | null;
  featuredFilm: { id: string; title: string } | null;
  check: PublishCheck | null;
}) {
  const id = article?.id ?? null;
  const draftKey = storageKeys.draft('article', id);
  const defaults = useMemo(() => toValues(article), [article]);
  const form = useForm<Values, unknown, Output>({
    resolver: zodResolver(articleInputSchema),
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
    article?.cover ? { [article.cover.id]: article.cover } : {},
  );
  const [films, setFilms] = useState<Record<string, string>>(() =>
    featuredFilm ? { [featuredFilm.id]: featuredFilm.title } : {},
  );
  const [slugTouched, setSlugTouched] = useState(id !== null);
  const extra = useMemo<Extra>(() => ({ media, films }), [media, films]);

  useAutosave(form.subscribe, draftKey, extra);
  useUnsavedWarning(isDirty);
  const { draft, dismiss } = useInitialDraft<Values>(draftKey);
  const showDraft = draft && JSON.stringify(draft.values) !== JSON.stringify(defaults);
  const [kind, coverId, featuredFilmId, body, seoTitle, seoDescription, excerpt] = useWatch({
    control,
    name: ['kind', 'coverId', 'featuredFilmId', 'body', 'seoTitle', 'seoDescription', 'excerpt'],
  });
  const cover = coverId ? (media[coverId] ?? null) : null;

  const { submit, pending, formError } = useEditorSave({
    kind: 'articles',
    id,
    form,
    draftKey,
    // Date et lieu n'ont de sens que pour un événement.
    normalize: (values) =>
      values.kind === 'EVENT'
        ? values
        : { ...values, eventStart: undefined, eventPlace: undefined },
  });

  const titleField = register('title');
  const deleted = article?.deletedAt != null;
  const publishPrimary = article
    ? panelPrimaryOp({ kind: 'articles', state: article.state, deleted, check, dirty: isDirty }) !==
      null
    : false;

  return (
    <>
      <form onSubmit={submit} noValidate className={EDITOR_MAIN}>
        {showDraft ? (
          <DraftBanner
            draft={draft}
            onRestore={() => {
              const saved = (draft.extra ?? {}) as Extra;
              if (saved.media) setMedia((m) => ({ ...saved.media, ...m }));
              if (saved.films) setFilms((f) => ({ ...saved.films, ...f }));
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
          <FormError message="Ce contenu est dans la corbeille : restaurez-le pour le modifier." />
        ) : null}
        <FormError message={formError} />

        <FormSection title="Contenu">
          <div className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
            <SelectField label="Type" error={errors.kind?.message} {...register('kind')}>
              {articleKindSchema.options.map((k) => (
                <option key={k} value={k}>
                  {ARTICLE_KIND_LABELS[k]}
                </option>
              ))}
            </SelectField>
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
          </div>
          <div className="flex flex-col gap-2">
            <TextField
              label="Adresse (slug)"
              help={
                id
                  ? 'La modifier crée automatiquement une redirection depuis l’ancienne adresse.'
                  : 'Proposée à partir du titre.'
              }
              error={errors.slug?.message}
              {...register('slug', { onChange: () => setSlugTouched(true) })}
            />
            <div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setValue('slug', slugify(getValues('title')), {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              >
                Proposer depuis le titre
              </Button>
            </div>
          </div>
          <TextAreaField
            label="Chapeau"
            rows={3}
            help={
              <CharCounter
                value={excerpt}
                max={300}
                hint="Résumé de 1 à 2 phrases, affiché dans les listes."
              />
            }
            error={errors.excerpt?.message}
            {...register('excerpt')}
          />
          <MarkdownField
            label="Texte"
            value={body}
            error={errors.body?.message}
            textarea={register('body')}
          />
        </FormSection>

        {kind === 'EVENT' ? (
          <FormSection
            title="Événement"
            description="Date et lieu affichés sur la fiche de l’événement."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Controller
                control={control}
                name="eventStart"
                render={({ field, fieldState }) => (
                  <DateTimeField
                    label="Date et heure"
                    optional
                    value={field.value}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                  />
                )}
              />
              <TextField
                label="Lieu"
                optional
                placeholder="Ex. : Cour de l’INA, Kinshasa"
                error={errors.eventPlace?.message}
                {...register('eventPlace')}
              />
            </div>
          </FormSection>
        ) : null}

        <FormSection title="Image de couverture" description="Format paysage (16:9) conseillé.">
          <ImageUploadField
            label="Couverture"
            ratio="16/9"
            value={cover}
            error={errors.coverId?.message}
            help="JPEG, PNG, WebP ou AVIF · 4 Mo au plus."
            onChange={(image) => {
              if (image) setMedia((m) => ({ ...m, [image.id]: image }));
              setValue('coverId', image?.id, { shouldDirty: true, shouldValidate: true });
            }}
          />
        </FormSection>

        <FormSection
          title="Film mis en avant"
          description="Facultatif : un film du catalogue présenté sous le texte."
        >
          {featuredFilmId ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border border-border bg-bg px-3 py-2">
              <span>{films[featuredFilmId] ?? 'Film sélectionné'}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setValue('featuredFilmId', undefined, { shouldDirty: true })}
              >
                Retirer
              </Button>
            </div>
          ) : null}
          <SearchPicker
            label={featuredFilmId ? 'Choisir un autre film' : 'Rechercher un film'}
            placeholder="Titre du film…"
            search={searchFilmsAction}
            onPick={(row) => {
              setFilms((f) => ({ ...f, [row.id]: row.title }));
              setValue('featuredFilmId', row.id, { shouldDirty: true });
            }}
          />
        </FormSection>

        <FormSection
          title="Référencement (SEO)"
          description="Facultatif : par défaut, le titre et le chapeau sont utilisés."
        >
          <TextField
            label="Titre pour les moteurs de recherche"
            optional
            help={<CharCounter value={seoTitle} max={60} hint="60 caractères au plus." />}
            error={errors.seoTitle?.message}
            {...register('seoTitle')}
          />
          <TextAreaField
            label="Description pour les moteurs de recherche"
            optional
            rows={3}
            help={<CharCounter value={seoDescription} max={160} hint="160 caractères au plus." />}
            error={errors.seoDescription?.message}
            {...register('seoDescription')}
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
        {article ? (
          <PublishPanel
            kind="articles"
            id={article.id}
            confirmText={article.title}
            state={article.state}
            publishAt={article.publishAt}
            deleted={deleted}
            check={check}
            dirty={isDirty}
            publicHref={`/fr/actualites/${article.slug}`}
          />
        ) : (
          <section className="border border-border bg-surface-1 p-4 text-sm text-muted md:p-5">
            <h2 className="font-serif text-xl text-text">Après la création</h2>
            <p className="mt-3">
              Ajoutez une couverture avec son texte alternatif, relisez l’aperçu, puis publiez ou
              planifiez.
            </p>
          </section>
        )}
      </aside>
    </>
  );
}
