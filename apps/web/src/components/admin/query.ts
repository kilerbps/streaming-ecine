import { publishStateSchema, type PublishState } from '@ecine/contracts';

export type SearchParams = Record<string, string | string[] | undefined>;

export function param(sp: SearchParams, key: string): string | undefined {
  const value = sp[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

/** Filtres de liste lus dans l'URL (valeurs inconnues ignorées). */
export function parseListQuery(sp: SearchParams): {
  q?: string;
  state?: PublishState;
  includeDeleted?: 'true';
} {
  const state = publishStateSchema.safeParse(param(sp, 'state'));
  return {
    q: param(sp, 'q')?.slice(0, 80),
    state: state.success ? state.data : undefined,
    includeDeleted: param(sp, 'includeDeleted') === 'true' ? 'true' : undefined,
  };
}

/** Période des statistiques (7, 30 ou 90 jours ; 30 par défaut). */
export function statsDays(value: string | undefined): 7 | 30 | 90 {
  return value === '7' ? 7 : value === '90' ? 90 : 30;
}
