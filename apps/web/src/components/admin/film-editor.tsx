'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch, type Control } from 'react-hook-form';
import {
  creditRoleSchema,
  FILM_LANGUAGES,
  filmInputSchema,
  filmKindSchema,
  PREVIEW_CLIP,
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
import {
  CharCounter,
  CONTROL,
  DateTimeField,
  emptyToUndefined,
  optionalInt,
  SelectField,
} from './fields';
import { formatTimecode, parseTimecode } from '@/lib/format';
import { slugify } from './format';
import { ImageUploadField, type AdminImage } from './image-upload-field';
import { CREDIT_ROLE_LABELS, FILM_KIND_LABELS, FILM_LANGUAGE_LABELS } from './labels';
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
    tagline: film?.tagline ?? '',
    audioLanguages: film?.audioLanguages ?? [],
    subtitleLanguages: film?.subtitleLanguages ?? [],
    filmingLocation: film?.filmingLocation ?? '',
    titleImageId: film?.titleImage?.id ?? undefined,
    creditsStartSec: film?.creditsStartSec ?? undefined,
    previewStartSec: film?.previewStartSec ?? undefined,
    releaseAt: film?.releaseAt ?? undefined,
    availableUntil: film?.availableUntil ?? undefined,
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

  const [media, setMedia] = useState<Record<string, AdminImage>>(() => ({
    ...(film?.poster ? { [film.poster.id]: film.poster } : {}),
    ...(film?.titleImage ? { [film.titleImage.id]: film.titleImage } : {}),
  }));
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
  const [posterId, titleImageId, tagline, seoTitle, seoDescription, filmTitle] = useWatch({
    control,
    name: ['posterId', 'titleImageId', 'tagline', 'seoTitle', 'seoDescription', 'title'],
  });
  const poster = posterId ? (media[posterId] ?? null) : null;
  const titleImage = titleImageId ? (media[titleImageId] ?? null) : null;

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
              help="Obligatoire pour publier."
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
          <div className="flex flex-col gap-1">
            <TextField
              label="Phrase d’accroche"
              optional
              maxLength={80}
              help="Une phrase sur l’affiche à la une et dans Découvrir. Obligatoire pour programmer le film à la une."
              error={errors.tagline?.message}
              {...register('tagline')}
            />
            <CharCounter value={tagline ?? ''} max={80} />
          </div>
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
          title="Langues, lieu et dates"
          description="Affichés sur la fiche et l’aperçu rapide. Au moins une langue audio pour publier."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <LanguageChecklist
              control={control}
              name="audioLanguages"
              legend="Langues audio"
              error={errors.audioLanguages?.message}
            />
            <LanguageChecklist
              control={control}
              name="subtitleLanguages"
              legend="Sous-titres disponibles"
              optional
            />
          </div>
          <TextField
            label="Lieu de tournage"
            optional
            placeholder="Ex. : Kinshasa"
            error={errors.filmingLocation?.message}
            {...register('filmingLocation')}
          />
          <div className="grid gap-5 md:grid-cols-2">
            <Controller
              control={control}
              name="releaseAt"
              render={({ field, fieldState }) => (
                <DateTimeField
                  label="Sortie annoncée"
                  optional
                  help="Avant cette date, le film est « Bientôt » : sa page est visible, avec « Me le rappeler », mais il ne se lit pas encore. Heure de Kinshasa."
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="availableUntil"
              render={({ field, fieldState }) => (
                <DateTimeField
                  label="Fin de disponibilité"
                  optional
                  help="Seulement si elle est réelle (fin des droits) : elle est affichée sur la fiche. Heure de Kinshasa."
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
          </div>
          <Controller
            control={control}
            name="creditsStartSec"
            render={({ field, fieldState }) => (
              <TextField
                label="Début du générique de fin"
                optional
                inputMode="numeric"
                placeholder="mm:ss, ex. 1:32:10 ou 88:40"
                help="Pour proposer « À suivre » au bon moment. Sans valeur : 30 secondes avant la fin."
                name={field.name}
                onBlur={field.onBlur}
                defaultValue={field.value ? formatTimecode(field.value) : ''}
                onChange={(event) => field.onChange(parseTimecode(event.target.value))}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="previewStartSec"
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-3">
                <TextField
                  label="Début de l’aperçu"
                  optional
                  inputMode="numeric"
                  placeholder="mm:ss, ex. 12:40"
                  help={`Extrait muet de ${PREVIEW_CLIP.seconds} s en 240p, filigrané, montré à la une et dans l’aperçu rapide. Choisissez un passage sans scène clé ni fin, autorisé par les ayants droit. Sans valeur : pas d’aperçu.`}
                  name={field.name}
                  onBlur={field.onBlur}
                  defaultValue={field.value ? formatTimecode(field.value) : ''}
                  onChange={(event) => field.onChange(parseTimecode(event.target.value))}
                  error={fieldState.error?.message}
                />
                {/* Extrait actuel : l'équipe le vérifie avant de publier (ADR-0015). */}
                {film?.previewUrl ? (
                  <video
                    src={film.previewUrl}
                    controls
                    muted
                    playsInline
                    preload="metadata"
                    aria-label="Aperçu actuel"
                    className="w-full max-w-sm rounded-md bg-surface-2"
                  />
                ) : film?.previewStartSec != null ? (
                  <p className="text-sm text-muted">
                    Aperçu en préparation : rechargez la page dans une minute.
                  </p>
                ) : null}
              </div>
            )}
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
            previewTitle={filmTitle}
            allowDecorative={false}
            error={errors.posterId?.message}
            help="JPEG, PNG, WebP ou AVIF · 4 Mo au plus."
            onChange={(image) => {
              if (image) setMedia((m) => ({ ...m, [image.id]: image }));
              setValue('posterId', image?.id, { shouldDirty: true, shouldValidate: true });
            }}
          />
          <ImageUploadField
            label="Titre dessiné (facultatif)"
            value={titleImage}
            allowDecorative={false}
            error={errors.titleImageId?.message}
            help="Le titre du film en image (PNG ou WebP transparent) : il remplace le titre écrit sur l’affiche à la une et la fiche. Texte alternatif : le titre."
            onChange={(image) => {
              if (image) setMedia((m) => ({ ...m, [image.id]: image }));
              setValue('titleImageId', image?.id, { shouldDirty: true, shouldValidate: true });
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

/** Cases à cocher des langues d'un film (audio ou sous-titres). */
function LanguageChecklist({
  control,
  name,
  legend,
  optional = false,
  error,
}: {
  control: Control<Values, unknown, Output>;
  name: 'audioLanguages' | 'subtitleLanguages';
  legend: string;
  optional?: boolean;
  error?: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const selected = field.value ?? [];
        return (
          <fieldset aria-invalid={error ? true : undefined}>
            <legend className="text-sm font-medium">
              {legend}
              {optional ? <span className="font-normal text-muted"> (facultatif)</span> : null}
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
              {FILM_LANGUAGES.map((code) => (
                <label key={code} className="flex min-h-11 items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="size-5 accent-[var(--accent)]"
                    checked={selected.includes(code)}
                    onChange={(event) =>
                      field.onChange(
                        event.target.checked
                          ? FILM_LANGUAGES.filter((c) => c === code || selected.includes(c))
                          : selected.filter((c) => c !== code),
                      )
                    }
                  />
                  {FILM_LANGUAGE_LABELS[code]}
                </label>
              ))}
            </div>
            {error ? <p className="mt-1 text-sm text-danger">{error}</p> : null}
          </fieldset>
        );
      }}
    />
  );
}
