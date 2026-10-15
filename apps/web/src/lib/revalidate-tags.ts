/**
 * Étiquettes de revalidation acceptées par /api/revalidate : un nom (`films`, `whats-new`) ou un nom
 * suivi d'un identifiant (`film:{slug}`). Liste des étiquettes émises : apps/api,
 * src/revalidate/content-events.service.ts.
 */
export const REVALIDATE_TAG = /^[a-z]+(?:-[a-z]+)*(?::[a-z0-9-]+)?$/;
