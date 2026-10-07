import Form from 'next/form';
import Link from 'next/link';
import type { PublishState } from '@ecine/contracts';
import { Button } from '@/components/ui/button';
import { STATE_LABELS } from './labels';

const CONTROL = 'min-h-11 w-full rounded-xs border border-border-strong bg-bg px-3 py-2 text-text';

/**
 * Filtres d'une liste (recherche, état, corbeille) : formulaire GET, l'URL porte l'état (partageable,
 * bouton retour), le Server Component relit les paramètres.
 */
export function ListFilters({
  action,
  q,
  state,
  includeDeleted,
  searchLabel = 'Rechercher par titre',
  withState = true,
  withDeleted = true,
}: {
  action: string;
  q?: string;
  state?: PublishState;
  includeDeleted?: boolean;
  searchLabel?: string;
  withState?: boolean;
  withDeleted?: boolean;
}) {
  const filtered = Boolean(q || state || includeDeleted);
  return (
    <Form
      action={action}
      className="mb-6 flex flex-col gap-4 border border-border bg-surface-1 p-4 md:flex-row md:flex-wrap md:items-end"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 md:min-w-64">
        <label htmlFor="filtre-q" className="text-sm font-medium">
          {searchLabel}
        </label>
        <input
          id="filtre-q"
          name="q"
          type="search"
          defaultValue={q ?? ''}
          maxLength={80}
          className={CONTROL}
        />
      </div>
      {withState ? (
        <div className="flex flex-col gap-1.5 md:w-48">
          <label htmlFor="filtre-etat" className="text-sm font-medium">
            État
          </label>
          <select id="filtre-etat" name="state" defaultValue={state ?? ''} className={CONTROL}>
            <option value="">Tous</option>
            {(Object.keys(STATE_LABELS) as PublishState[]).map((s) => (
              <option key={s} value={s}>
                {STATE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {withDeleted ? (
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="includeDeleted"
            value="true"
            defaultChecked={includeDeleted}
            className="size-5 accent-[var(--accent)]"
          />
          Afficher la corbeille
        </label>
      ) : null}
      <div className="flex items-center gap-3">
        <Button type="submit" variant="secondary" icon="search">
          Filtrer
        </Button>
        {filtered ? (
          <Link
            href={action}
            className="min-h-11 content-center px-2 text-sm text-muted underline hover:text-text"
          >
            Effacer les filtres
          </Link>
        ) : null}
      </div>
    </Form>
  );
}
