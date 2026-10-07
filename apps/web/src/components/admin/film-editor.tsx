'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import {
  creditRoleSchema,
  filmInputSchema,
  filmKindSchema,
  type AdminCategory,
  type AdminFilm,
  type CreditRole,
  type PublishCheck,
} from '@ecine/contracts';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { CheckboxField, FormError, TextAreaField, TextField } from '@/components/ui/field';
import { searchPeopleAction } from '@/server/actions/admin/content';
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
import { CharCounter, CONTROL, emptyToUndefined, optionalInt, SelectField } from './fields';
import { slugify } from './format';
import { ImageUploadField, type AdminImage } from './image-upload-field';
import { CREDIT_ROLE_LABELS, FILM_KIND_LABELS } from './labels';
import { panelPrimaryOp, PublishPanel } from './publish-panel';
import { SearchPicker } from './search-picker';

type Values = z.input<typeof filmInputSchema>;
type Output = z.output<typeof filmInputSchema>;
interface Extra {
  media?: Record<string, AdminImage>;
  people?: Record<string, string>;
}

function toValues(film: AdminFilm | null): Values {
  return {
    slug: film?.slug ?? '',
    kind: film?.kind ?? 'FEATURE',
    title: film?.title ?? '',
    synopsis: film?.synopsis ?? '',
    originalTitle: film?.originalTitle ?? '',
    year: film?.year ?? undefined,
    runtimeSec: film?.runtimeSec ?? undefined,
    ageRating: film?.ageRating ?? '',
    trailerUrl: film?.trailerUrl ?? undefined,
    rightsNote: film?.rightsNote ?? '',
    rightsOk: film?.rightsOk ?? false,
    posterId: film?.poster?.id ?? undefined,
    categoryIds: film?.categoryIds ?? [],
    credits:
      film?.credits.map((c, i) => ({
        personId: c.personId,
        role: c.role,
        character: c.character ?? '',
        position: i,
      })) ?? [],
    seoTitle: film?.seoTitle ?? '',
    seoDescription: film?.seoDescription ?? '',
    seoNoIndex: film?.seoNoIndex ?? false,
  };
}

/**
 * Fiche film / court-métrage : informations, droits, catégories, crédits, affiche, SEO.
 * Brouillon local automatique ; « Enregistrer » est le CTA principal tant qu'il y a des modifications.
 */
export function FilmEditor({
  film,
  categories,
  check,
}: {
  film: AdminFilm | null;
  categories: AdminCategory[];
  check: PublishCheck | null;
}) {
  const id = film?.id ?? null;
  const draftKey = storageKeys.draft('film', id);
  const defaults = useMemo(() => toValues(film), [film]);
  const form = useForm<Values, unknown, Output>({
    resolver: zodResolver(filmInputSchema),
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
    film?.poster ? { [film.poster.id]: film.poster } : {},
  );
  const [people, setPeople] = useState<Record<string, string>>(() =>
    Object.fromEntries((film?.credits ?? []).map((c) => [c.personId, c.personName])),
  );
  const [slugTouched, setSlugTouched] = useState(id !== null);
  const [newRole, setNewRole] = useState<CreditRole>('ACTOR');
  const extra = useMemo<Extra>(() => ({ media, people }), [media, people]);

  useAutosave(form.subscribe, draftKey, extra);
  useUnsavedWarning(isDirty);
  const { draft, dismiss } = useInitialDraft<Values>(draftKey);
  const showDraft = draft && JSON.stringify(draft.values) !== JSON.stringify(defaults);

  const { fields, append, remove, move } = useFieldArray({ control, name: 'credits' });
  const [posterId, seoTitle, seoDescription] = useWatch({
    control,
    name: ['posterId', 'seoTitle', 'seoDescription'],
  });
  const poster = posterId ? (media[posterId] ?? null) : null;

  const { submit, pending, formError } = useEditorSave({
    kind: 'films',
    id,
    form,
    draftKey,
    normalize: (values) => ({
      ...values,
      credits: values.credits.map((c, position) => ({ ...c, position })),
    }),
  });

  const restore = () => {
    if (!draft) return;
    const saved = (draft.extra ?? {}) as Extra;
    if (saved.media) setMedia((m) => ({ ...saved.media, ...m }));
    if (saved.people) setPeople((p) => ({ ...saved.people, ...p }));
    reset(draft.values, { keepDefaultValues: true });
    dismiss();
  };

  const titleField = register('title');
  const deleted = film?.deletedAt != null;
  const publishPrimary = film
    ? panelPrimaryOp({ kind: 'films', state: film.state, deleted, check, dirty: isDirty }) !== null
    : false;

  return (
    <>
      <form onSubmit={submit} noValidate className={EDITOR_MAIN}>
        {showDraft ? (
          <DraftBanner
            draft={draft}
            onRestore={restore}
            onDismiss={() => {
              clearDraft(draftKey);
              dismiss();
            }}
          />
        ) : null}
        {deleted ? (
          <FormError message="Ce film est dans la corbeille : restaurez-le pour le modifier." />
        ) : null}
        <FormError message={formError} />

        <FormSection
          title="Informations"
          description="Titre et résumé en français, affichés sur la fiche publique."
        >
          <div className="grid gap-5 md:grid-cols-2">
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
              label="Titre original"
              optional
              error={errors.originalTitle?.message}
              {...register('originalTitle')}
            />
          </div>
          <div className="flex flex-col gap-2">
            <TextField
              label="Adresse (slug)"
              help={
                id
                  ? 'Partie finale de l’adresse publique. La modifier crée automatiquement une redirection depuis l’ancienne adresse.'
                  : 'Proposée à partir du titre : lettres minuscules, chiffres et tirets.'
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
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <SelectField label="Type" error={errors.kind?.message} {...register('kind')}>
              {filmKindSchema.options.map((k) => (
                <option key={k} value={k}>
                  {FILM_KIND_LABELS[k]}
                </option>
              ))}
            </SelectField>
            <TextField
              label="Année"
              optional
              type="number"
              inputMode="numeric"
              min={1900}
              max={2100}
              error={errors.year?.message}
              {...register('year', { setValueAs: optionalInt })}
            />
            <Controller
              control={control}
              name="runtimeSec"
              render={({ field, fieldState }) => (
                <TextField
                  label="Durée (minutes)"
                  optional
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  name={field.name}
                  onBlur={field.onBlur}
                  value={field.value ? String(Math.round(field.value / 60)) : ''}
                  onChange={(event) => {
                    const minutes = optionalInt(event.target.value);
                    field.onChange(minutes ? minutes * 60 : undefined);
                  }}
                  error={fieldState.error?.message}
                />
              )}
            />
            <TextField
              label="Classification d’âge"
              optional
              placeholder="Ex. : 12+"
              error={errors.ageRating?.message}
              {...register('ageRating')}
            />
          </div>
          <TextAreaField
            label="Résumé (synopsis)"
            rows={6}
            error={errors.synopsis?.message}
            {...register('synopsis')}
          />
          <TextField
            label="Bande-annonce (URL)"
            optional
            type="url"
            inputMode="url"
            placeholder="https://…"
            error={errors.trailerUrl?.message}
            {...register('trailerUrl', { setValueAs: emptyToUndefined })}
          />
        </FormSection>

        <FormSection
          title="Droits de diffusion"
          description="Aucun film n’est publié sans autorisation écrite des ayants droit."
        >
          <TextAreaField
            label="Preuve d’autorisation"
            help="Ex. : contrat signé le 12/09/2026 avec la réalisatrice, conservé au secrétariat d’E-Ciné (réf. 2026-031)."
            rows={3}
            error={errors.rightsNote?.message}
            {...register('rightsNote')}
          />
          <CheckboxField
            label="Je confirme qu’E-Ciné détient l’autorisation de diffuser ce film."
            error={errors.rightsOk?.message}
            {...register('rightsOk')}
          />
        </FormSection>

        <FormSection
          title="Affiche"
          description="Format portrait (2:3) conseillé. Le texte alternatif décrit l’affiche pour les personnes aveugles."
        >
          <ImageUploadField
            label="Affiche du film"
            value={poster}
            allowDecorative={false}
            error={errors.posterId?.message}
            help="JPEG, PNG, WebP ou AVIF · 4 Mo au plus."
            onChange={(image) => {
              if (image) setMedia((m) => ({ ...m, [image.id]: image }));
              setValue('posterId', image?.id, { shouldDirty: true, shouldValidate: true });
            }}
          />
        </FormSection>

        <FormSection title="Catégories" description="Jusqu’à 10 catégories.">
          <Controller
            control={control}
            name="categoryIds"
            render={({ field, fieldState }) => {
              const selected = field.value ?? [];
              return (
                <fieldset>
                  <legend className="sr-only">Catégories du film</legend>
                  {categories.length === 0 ? (
                    <p className="text-sm text-muted">
                      Aucune catégorie : créez-en depuis l’écran Catégories.
                    </p>
                  ) : (
                    <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
                      {categories.map((category) => (
                        <label
                          key={category.id}
                          className="flex min-h-11 items-center gap-3 text-sm"
                        >
                          <input
                            type="checkbox"
                            className="size-5 accent-[var(--accent)]"
                            checked={selected.includes(category.id)}
                            onChange={(event) =>
                              field.onChange(
                                event.target.checked
                                  ? [...selected, category.id]
                                  : selected.filter((c) => c !== category.id),
                              )
                            }
                          />
                          {category.name}
                        </label>
                      ))}
                    </div>
                  )}
                  {fieldState.error ? (
                    <p className="mt-2 text-sm text-danger" role="alert">
                      {fieldState.error.message}
                    </p>
                  ) : null}
                </fieldset>
              );
            }}
          />
        </FormSection>

        <FormSection
          title="Générique (crédits)"
          description="Réalisation, interprétation, équipe technique. L’ordre est celui de l’affichage."
        >
          {fields.length === 0 ? (
            <p className="text-sm text-muted">Aucun crédit pour l’instant.</p>
          ) : null}
          <ol className="flex flex-col gap-3">
            {fields.map((field, index) => (
              <li
                key={field.id}
                className="grid gap-3 border border-border bg-bg p-3 md:grid-cols-[minmax(0,1fr)_180px_minmax(0,1fr)_auto] md:items-end"
              >
                <div className="min-w-0">
                  <p className="meta">N° {index + 1}</p>
                  <p className="truncate font-medium">{people[field.personId] ?? 'Personne'}</p>
                  {errors.credits?.[index]?.personId ? (
                    <p className="text-sm text-danger">
                      {errors.credits[index]?.personId?.message}
                    </p>
                  ) : null}
                </div>
                <SelectField label="Rôle" {...register(`credits.${index}.role`)}>
                  {creditRoleSchema.options.map((r) => (
                    <option key={r} value={r}>
                      {CREDIT_ROLE_LABELS[r]}
                    </option>
                  ))}
                </SelectField>
                <TextField
                  label="Personnage"
                  optional
                  error={errors.credits?.[index]?.character?.message}
                  {...register(`credits.${index}.character`)}
                />
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="arrowUp"
                    aria-label="Monter"
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="arrowDown"
                    aria-label="Descendre"
                    disabled={index === fields.length - 1}
                    onClick={() => move(index, index + 1)}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="trash"
                    aria-label="Retirer ce crédit"
                    onClick={() => remove(index)}
                  />
                </div>
              </li>
            ))}
          </ol>
          {errors.credits?.message ? (
            <p className="text-sm text-danger">{errors.credits.message}</p>
          ) : null}
          <div className="grid gap-4 border-t border-border pt-4 md:grid-cols-[minmax(0,1fr)_200px]">
            <SearchPicker
              label="Ajouter une personne"
              placeholder="Nom de l’actrice, du réalisateur…"
              help={
                <>
                  Tapez au moins 2 lettres. Personne absente ?{' '}
                  <Link
                    href="/admin/people/nouveau"
                    target="_blank"
                    rel="noopener"
                    className="underline"
                  >
                    Créer sa fiche
                  </Link>
                  .
                </>
              }
              search={searchPeopleAction}
              onPick={(row) => {
                setPeople((p) => ({ ...p, [row.id]: row.title }));
                append({ personId: row.id, role: newRole, character: '', position: fields.length });
              }}
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="credit-new-role" className="text-sm font-medium">
                Rôle de la personne ajoutée
              </label>
              <select
                id="credit-new-role"
                className={CONTROL}
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as CreditRole)}
              >
                {creditRoleSchema.options.map((r) => (
                  <option key={r} value={r}>
                    {CREDIT_ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Référencement (SEO)"
          description="Facultatif : par défaut, le titre et le résumé du film sont utilisés."
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
          <CheckboxField label="Ne pas indexer cette fiche (noindex)" {...register('seoNoIndex')} />
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
        {film ? (
          <PublishPanel
            kind="films"
            id={film.id}
            confirmText={film.title}
            state={film.state}
            publishAt={film.publishAt}
            deleted={deleted}
            check={check}
            dirty={isDirty}
            publicHref={`/fr/films/${film.slug}`}
          />
        ) : (
          <section className="border border-border bg-surface-1 p-4 text-sm md:p-5">
            <h2 className="font-serif text-xl">Étapes suivantes</h2>
            <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-muted">
              <li>Créez le brouillon (titre, résumé, preuve d’autorisation).</li>
              <li>Ajoutez l’affiche et son texte alternatif.</li>
              <li>Envoyez la vidéo et attendez la fin du transcodage.</li>
              <li>Vérifiez les contrôles avant publication, puis publiez ou planifiez.</li>
            </ol>
          </section>
        )}
      </aside>
    </>
  );
}
