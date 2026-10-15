'use client';

import { useState } from 'react';
import {
  HOME_EDITORIAL_ROWS_MAX,
  HOME_FEATURED_MAX,
  HOME_ROW_FILMS_MAX,
  HOME_TALENTS_MAX,
  HOME_TALENTS_MIN,
  homeInputSchema,
  type AdminHome,
  type AdminPick,
  type HomeInput,
} from '@ecine/contracts';
import { Button } from '@/components/ui/button';
import { CheckboxField, FormError, TextField } from '@/components/ui/field';
import { IconButton } from '@/components/ui/icon-button';
import { Tag } from '@/components/ui/tag';
import { searchFilmsAction, searchPeopleAction } from '@/server/actions/admin/content';
import { saveHomeAction } from '@/server/actions/admin/site';
import { FormSection, SaveBar, useUnsavedWarning } from './editor-kit';
import { DateTimeField } from './fields';
import { SearchPicker } from './search-picker';
import { useAdminAction } from './use-admin-action';

interface Slot {
  key: string;
  film: AdminPick;
  startsAt: string;
  endsAt: string | null;
  previewVideo: boolean;
}

interface EditorialRow {
  key: string;
  id?: string;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  films: AdminPick[];
}

/** Rangées calculées : affichées avec leur règle, jamais déplaçables (docs/design/05-admin.md). */
const AUTOMATIC_ROWS: Array<[string, string]> = [
  ['Reprendre', 'Lectures en cours de chaque personne (entre 2 min et 95 %).'],
  ['Top 10 en RDC cette semaine', 'Calculé chaque jour ; affiché dès 10 titres lus sur 7 jours.'],
  ['Nouveautés sur E-Ciné', 'Titres publiés depuis moins de 30 jours ; affichée dès 4 titres.'],
  ['Courts-métrages : 15 minutes ou moins', 'Affichée dès 4 courts-métrages.'],
  ['Bientôt sur E-Ciné', 'Titres dont la sortie est annoncée, la plus proche d’abord.'],
  ['Talents à l’honneur', 'Les talents choisis ci-dessous (6 à 12).'],
  ['Vos rangées éditoriales', 'Dans l’ordre choisi ci-dessus.'],
  ['Rangées par catégorie', 'Une rangée par catégorie qui compte 4 titres lisibles.'],
];

function move<T>(list: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item as T);
  return next;
}

/** Clés locales des emplacements et rangées (stables pendant l'édition, jamais envoyées à l'API). */
let keySequence = 0;
const nextKey = () => `k${(keySequence += 1)}`;

/** État de l'écran → corps de PUT /admin/home (ordre des listes = ordre d'affichage). */
function toInput(slots: Slot[], rows: EditorialRow[], talents: AdminPick[]): HomeInput {
  return {
    featured: slots.map((slot) => ({
      filmId: slot.film.id,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      previewVideo: slot.previewVideo,
    })),
    rows: rows.map((row) => ({
      ...(row.id ? { id: row.id } : {}),
      title: row.title,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      filmIds: row.films.map((film) => film.id),
    })),
    talentIds: talents.map((talent) => talent.id),
  };
}

const pickOf = (row: { id: string; title: string; meta: string | null }): AdminPick => ({
  id: row.id,
  title: row.title,
  meta: row.meta,
});

/** Boutons Monter, Descendre, Retirer : l'équivalent clavier du glisser-déposer. */
function OrderControls({
  label,
  index,
  count,
  onMove,
  onRemove,
}: {
  label: string;
  index: number;
  count: number;
  onMove: (delta: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center">
      <IconButton
        icon="arrowUp"
        label={`Monter : ${label}`}
        disabled={index === 0}
        onClick={() => onMove(-1)}
      />
      <IconButton
        icon="arrowDown"
        label={`Descendre : ${label}`}
        disabled={index === count - 1}
        onClick={() => onMove(1)}
      />
      <IconButton icon="trash" label={`Retirer : ${label}`} onClick={onRemove} />
    </div>
  );
}

/** Liste ordonnée de films ou de talents, avec recherche pour en ajouter. */
function PickList({
  items,
  onChange,
  max,
  pickerLabel,
  search,
}: {
  items: AdminPick[];
  onChange: (items: AdminPick[]) => void;
  max: number;
  pickerLabel: string;
  search: typeof searchFilmsAction;
}) {
  return (
    <div className="flex flex-col gap-3">
      {items.length > 0 ? (
        <ol className="flex flex-col divide-y divide-border rounded-md border border-border">
          {items.map((item, index) => (
            <li key={item.id} className="flex items-center gap-3 py-1 pl-3 pr-1">
              <span className="w-6 shrink-0 text-sm text-muted">{index + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{item.title}</span>
                {item.meta ? <span className="meta block">{item.meta}</span> : null}
              </span>
              <OrderControls
                label={item.title}
                index={index}
                count={items.length}
                onMove={(delta) => onChange(move(items, index, delta))}
                onRemove={() => onChange(items.filter((other) => other.id !== item.id))}
              />
            </li>
          ))}
        </ol>
      ) : null}
      {items.length < max ? (
        <SearchPicker
          label={pickerLabel}
          search={search}
          excludeIds={items.map((item) => item.id)}
          onPick={(row) => onChange([...items, pickOf(row)])}
        />
      ) : (
        <p className="text-sm text-muted">Maximum atteint ({max}).</p>
      )}
    </div>
  );
}

/**
 * Programmation de l'accueil : affiche à la une (5 emplacements), rangées éditoriales et talents à
 * l'honneur, enregistrés ensemble ; les rangées automatiques et le Top 10 sont consultables.
 */
export function HomeProgrammer({ home }: { home: AdminHome }) {
  const { run, pending } = useAdminAction();
  const [slots, setSlots] = useState<Slot[]>(() =>
    home.featured.map((slot) => ({ ...slot, key: nextKey() })),
  );
  const [rows, setRows] = useState<EditorialRow[]>(() =>
    home.rows.map((row) => ({ ...row, key: nextKey() })),
  );
  const [talents, setTalents] = useState<AdminPick[]>(home.talents);
  const [formError, setFormError] = useState<string | null>(null);

  const input = toInput(slots, rows, talents);
  const snapshot = JSON.stringify(input);
  // Dernier état enregistré : celui reçu de l'API, puis celui de chaque enregistrement réussi.
  const [saved, setSaved] = useState(snapshot);
  const dirty = snapshot !== saved;
  useUnsavedWarning(dirty);

  const updateSlot = (key: string, patch: Partial<Slot>) =>
    setSlots((list) => list.map((slot) => (slot.key === key ? { ...slot, ...patch } : slot)));
  const updateRow = (key: string, patch: Partial<EditorialRow>) =>
    setRows((list) => list.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const submit = () => {
    setFormError(null);
    const parsed = homeInputSchema.safeParse(input);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Vérifiez les champs.');
      return;
    }
    run(() => saveHomeAction(parsed.data), {
      success: 'Accueil mis à jour.',
      onSuccess: () => setSaved(snapshot),
      onError: (failure) => setFormError(failure.error),
    });
  };

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="flex flex-col gap-6"
    >
      <FormSection
        title="Affiche à la une"
        description={`${HOME_FEATURED_MAX} emplacements au plus, dans cet ordre. Un emplacement vide est complété par les derniers films publiés. La phrase d’accroche se modifie dans la fiche du film.`}
      >
        {slots.length > 0 ? (
          <ol className="flex flex-col gap-4">
            {slots.map((slot, index) => (
              <li
                key={slot.key}
                className="flex flex-col gap-4 rounded-md border border-border p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 shrink-0 text-sm text-muted">{index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{slot.film.title}</span>
                    {slot.film.meta ? <span className="meta block">{slot.film.meta}</span> : null}
                  </span>
                  <OrderControls
                    label={slot.film.title}
                    index={index}
                    count={slots.length}
                    onMove={(delta) => setSlots((list) => move(list, index, delta))}
                    onRemove={() => setSlots((list) => list.filter((s) => s.key !== slot.key))}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <DateTimeField
                    label="Début"
                    value={slot.startsAt}
                    onChange={(iso) => updateSlot(slot.key, { startsAt: iso ?? slot.startsAt })}
                  />
                  <DateTimeField
                    label="Fin"
                    optional
                    help="Heure de Kinshasa. Vide : sans fin."
                    value={slot.endsAt ?? undefined}
                    min={slot.startsAt}
                    onChange={(iso) => updateSlot(slot.key, { endsAt: iso ?? null })}
                  />
                </div>
                <CheckboxField
                  label="Aperçu vidéo muet (si le réseau et l’appareil le permettent)"
                  checked={slot.previewVideo}
                  onChange={(event) => updateSlot(slot.key, { previewVideo: event.target.checked })}
                />
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted">
            Aucun emplacement programmé : l’accueil montre les 5 derniers films publiés.
          </p>
        )}
        {slots.length < HOME_FEATURED_MAX ? (
          <SearchPicker
            label="Ajouter un film à la une"
            search={searchFilmsAction}
            excludeIds={slots.map((slot) => slot.film.id)}
            onPick={(row) =>
              setSlots((list) => [
                ...list,
                {
                  key: nextKey(),
                  film: pickOf(row),
                  startsAt: new Date().toISOString(),
                  endsAt: null,
                  previewVideo: false,
                },
              ])
            }
          />
        ) : null}
      </FormSection>

      <FormSection
        title="Rangées éditoriales"
        description={`Rangées nommées (« Spécial 30 juin »), placées après les talents à l’honneur. ${HOME_EDITORIAL_ROWS_MAX} au plus.`}
      >
        {rows.map((row, index) => (
          <div key={row.key} className="flex flex-col gap-4 rounded-md border border-border p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <TextField
                  label="Titre de la rangée"
                  value={row.title}
                  maxLength={60}
                  onChange={(event) => updateRow(row.key, { title: event.target.value })}
                />
              </div>
              <div className="pt-7">
                <OrderControls
                  label={row.title || `Rangée ${index + 1}`}
                  index={index}
                  count={rows.length}
                  onMove={(delta) => setRows((list) => move(list, index, delta))}
                  onRemove={() => setRows((list) => list.filter((r) => r.key !== row.key))}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <DateTimeField
                label="Début"
                optional
                help="Heure de Kinshasa. Vide : dès l’enregistrement."
                value={row.startsAt ?? undefined}
                onChange={(iso) => updateRow(row.key, { startsAt: iso ?? null })}
              />
              <DateTimeField
                label="Fin"
                optional
                help="Heure de Kinshasa. Vide : sans fin."
                value={row.endsAt ?? undefined}
                min={row.startsAt ?? undefined}
                onChange={(iso) => updateRow(row.key, { endsAt: iso ?? null })}
              />
            </div>
            <PickList
              items={row.films}
              onChange={(films) => updateRow(row.key, { films })}
              max={HOME_ROW_FILMS_MAX}
              pickerLabel="Ajouter un titre à la rangée"
              search={searchFilmsAction}
            />
          </div>
        ))}
        {rows.length < HOME_EDITORIAL_ROWS_MAX ? (
          <Button
            variant="secondary"
            icon="plus"
            className="self-start"
            onClick={() =>
              setRows((list) => [
                ...list,
                { key: nextKey(), title: '', startsAt: null, endsAt: null, films: [] },
              ])
            }
          >
            Ajouter une rangée
          </Button>
        ) : null}
      </FormSection>

      <FormSection
        title="Talents à l’honneur"
        description={`De ${HOME_TALENTS_MIN} à ${HOME_TALENTS_MAX} talents, en portraits ronds sur l’accueil. Aucun : la rangée est masquée.`}
      >
        <p className="text-sm text-muted" aria-live="polite">
          {talents.length} / {HOME_TALENTS_MAX}
          {talents.length > 0 && talents.length < HOME_TALENTS_MIN
            ? ` — encore ${HOME_TALENTS_MIN - talents.length} pour afficher la rangée`
            : ''}
        </p>
        <PickList
          items={talents}
          onChange={setTalents}
          max={HOME_TALENTS_MAX}
          pickerLabel="Ajouter un talent"
          search={searchPeopleAction}
        />
      </FormSection>

      <FormSection
        title="Rangées automatiques"
        description="Calculées à chaque visite, dans cet ordre ; une rangée sous son seuil n’est pas affichée."
      >
        <ol className="flex flex-col divide-y divide-border">
          {AUTOMATIC_ROWS.map(([title, rule]) => (
            <li
              key={title}
              className="flex flex-col gap-1 py-3 md:flex-row md:items-center md:gap-4"
            >
              <span className="font-medium md:w-72 md:shrink-0">{title}</span>
              <span className="text-sm text-muted">{rule}</span>
            </li>
          ))}
        </ol>
      </FormSection>

      <FormSection title="Top 10" description="Calculé, jamais modifiable à la main.">
        {home.top10 ? (
          <>
            <p className="text-sm text-muted">Instantané du {home.top10.day}.</p>
            <ol className="flex flex-col divide-y divide-border">
              {home.top10.entries.map((entry) => (
                <li key={entry.rank} className="flex items-center gap-3 py-2">
                  <Tag>{entry.rank}</Tag>
                  <span className="flex-1">{entry.title}</span>
                  <span className="meta">{entry.viewers} visiteurs</span>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="text-sm text-muted">
            Pas encore calculé : le calcul quotidien sera branché quand sa source aura été choisie
            (ADR-0012, point 1).
          </p>
        )}
      </FormSection>

      <FormError message={formError} />
      <SaveBar
        dirty={dirty}
        pending={pending}
        primary
        label="Enregistrer l’accueil"
        note={dirty ? 'Modifications non enregistrées.' : 'Tout est enregistré.'}
      />
    </form>
  );
}
