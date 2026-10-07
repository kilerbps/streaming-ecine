import type { PipeTransform } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { confirmQuerySchema, type Page } from '@ecine/contracts';
import { z } from 'zod';
import { decodeCursor, encodeCursor } from '../common/cursor.js';
import { ProblemException } from '../common/problem.js';
import type { Prisma } from '../generated/prisma/client.js';

// ——— Réponses ———

/**
 * Les réponses d'administration ne sont jamais mises en cache (navigateur, proxy, CDN).
 * Middleware (et non intercepteur) : s'applique aussi aux refus 401/403 des guards.
 */
export function noStore(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Cache-Control', 'no-store');
  next();
}

/** Toute suppression exige `?confirm=true` (docs/04-API-SPEC.md §3), sinon 400. */
export class ConfirmDeletionPipe implements PipeTransform {
  transform(value: unknown): z.infer<typeof confirmQuerySchema> {
    const parsed = confirmQuerySchema.safeParse(value);
    if (!parsed.success)
      throw ProblemException.badRequest('Confirmez la suppression (paramètre confirm=true).');
    return parsed.data;
  }
}

// ——— Pagination par curseur (ordre : date décroissante puis id) ———

const adminCursorSchema = z.object({ t: z.iso.datetime(), i: z.string().max(64) });
export type AdminCursor = z.infer<typeof adminCursorSchema>;

export function decodeAdminCursor(raw: string | undefined): AdminCursor | null {
  return decodeCursor(raw, adminCursorSchema);
}

/** Lignes strictement après le curseur, tri `updatedAt desc, id desc`. */
export function updatedBefore(cursor: AdminCursor | null) {
  if (!cursor) return {};
  const at = new Date(cursor.t);
  return { OR: [{ updatedAt: { lt: at } }, { updatedAt: at, id: { lt: cursor.i } }] };
}

/** Lignes strictement après le curseur, tri `createdAt desc, id desc`. */
export function createdBefore(cursor: AdminCursor | null) {
  if (!cursor) return {};
  const at = new Date(cursor.t);
  return { OR: [{ createdAt: { lt: at } }, { createdAt: at, id: { lt: cursor.i } }] };
}

/** Découpe `limit + 1` lignes en une page et calcule le curseur suivant. */
export function pageOf<T extends { id: string }, R>(
  rows: T[],
  limit: number,
  date: (row: T) => Date,
  map: (row: T) => R,
): Page<R> {
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return {
    items: page.map(map),
    nextCursor:
      rows.length > limit && last
        ? encodeCursor({ t: date(last).toISOString(), i: last.id })
        : null,
  };
}

/** Recherche insensible à la casse (paramètre lié, jamais concaténé). */
export function containsInsensitive(q: string) {
  return { contains: q, mode: 'insensitive' as const };
}

// ——— Journal d'audit ———

type AuditValue = string | number | boolean | null | string[];
export type AuditSnapshot = Record<string, AuditValue>;

const AUDIT_TEXT_MAX = 200;

function clip(value: AuditValue): AuditValue {
  return typeof value === 'string' && value.length > AUDIT_TEXT_MAX
    ? `${value.slice(0, AUDIT_TEXT_MAX)}…`
    : value;
}

/** Avant/après limité aux champs modifiés (textes longs tronqués) : lisible et sans secret. */
export function auditDiff(
  before: AuditSnapshot,
  after: AuditSnapshot,
): { before: AuditSnapshot; after: AuditSnapshot } {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  const changed = keys.filter(
    (k) => JSON.stringify(before[k] ?? null) !== JSON.stringify(after[k] ?? null),
  );
  return {
    before: Object.fromEntries(changed.map((k) => [k, clip(before[k] ?? null)])),
    after: Object.fromEntries(changed.map((k) => [k, clip(after[k] ?? null)])),
  };
}

/** Court extrait d'un texte (légende de publication, titre de liste). */
export function excerpt(text: string, max = 80): string {
  const line = text.trim().split('\n')[0] ?? '';
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

// ——— Redirections (slugs) ———

/** URLs publiques (docs/07-CHECKLIST-SEO-LEGAL-QUALITE.md) : changer un slug crée une redirection. */
export const publicPath = {
  film: (slug: string) => `/fr/films/${slug}`,
  person: (slug: string) => `/fr/personnes/${slug}`,
  article: (slug: string) => `/fr/actualites/${slug}`,
  category: (slug: string) => `/fr/categories/${slug}`,
  page: (slug: string) => `/fr/${slug}`,
} as const;

/** Problème bloquant pour une redirection saisie à la main (hors chaînes, vérifiées en base). */
export function redirectInputProblem(fromPath: string, toPath: string): string | null {
  if (fromPath === toPath) return 'Une redirection ne peut pas pointer vers elle-même.';
  return null;
}

/**
 * Ancienne URL → nouvelle URL (301). La nouvelle URL redevient une page vivante (sa redirection éventuelle
 * est supprimée : pas de boucle A→B→A) et les redirections qui visaient l'ancienne URL sont repointées
 * (pas de chaîne). À appeler dans la transaction de mise à jour.
 */
export async function redirectSlugChange(
  db: Prisma.TransactionClient,
  fromPath: string,
  toPath: string,
): Promise<void> {
  if (fromPath === toPath) return;
  await db.redirect.deleteMany({ where: { fromPath: toPath } });
  await db.redirect.updateMany({ where: { toPath: fromPath }, data: { toPath } });
  await db.redirect.upsert({
    where: { fromPath },
    create: { fromPath, toPath, status: 301 },
    update: { toPath, status: 301 },
  });
}

// ——— Images et références ———

export interface ImageRow {
  id: string;
  kind: string;
  alt: string | null;
  decorative: boolean;
}

/** Erreurs de validation pour des images référencées (introuvable, pas une image, sans texte alternatif). */
export function imageErrors(
  refs: Array<{ id: string; path: string }>,
  found: ImageRow[],
  requireAlt: boolean,
): Array<{ path: string; message: string }> {
  const byId = new Map(found.map((m) => [m.id, m]));
  return refs.flatMap(({ id, path }) => {
    const media = byId.get(id);
    if (!media) return [{ path, message: 'Image introuvable.' }];
    if (media.kind !== 'IMAGE') return [{ path, message: 'Ce fichier n’est pas une image.' }];
    if (requireAlt && !media.decorative && !media.alt?.trim()) {
      return [
        {
          path,
          message: 'Ajoutez un texte alternatif à cette image (ou marquez-la comme décorative).',
        },
      ];
    }
    return [];
  });
}

/** Vérifie en une requête que les images existent (et ont un texte alternatif si exigé), sinon 400. */
export async function assertImages(
  db: Prisma.TransactionClient,
  refs: Array<{ id: string; path: string }>,
  requireAlt: boolean,
): Promise<void> {
  if (refs.length === 0) return;
  const found = await db.media.findMany({
    where: { id: { in: [...new Set(refs.map((r) => r.id))] } },
    select: { id: true, kind: true, alt: true, decorative: true },
  });
  const errors = imageErrors(refs, found, requireAlt);
  if (errors.length > 0)
    throw ProblemException.badRequest('Certaines images ne peuvent pas être utilisées.', errors);
}

/** Identifiants en double dans une liste (images d'une publication, crédits…). */
export function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const v of values) (seen.has(v) ? dup : seen).add(v);
  return [...dup];
}

/** Date de planification : doit être dans le futur. */
export function scheduleDate(iso: string, now = new Date()): Date {
  const date = new Date(iso);
  if (date.getTime() <= now.getTime()) {
    throw ProblemException.badRequest('Choisissez une date de publication dans le futur.', [
      { path: 'publishAt', message: 'La date doit être dans le futur.' },
    ]);
  }
  return date;
}

/** Contenu supprimé (corbeille) : aucune action d'état avant restauration. */
export function assertNotDeleted(
  row: { deletedAt: Date | null },
  detail = 'Restaurez ce contenu avant de le modifier.',
): void {
  if (row.deletedAt) throw ProblemException.conflict(detail);
}

// ——— Statistiques ———

const DAY_MS = 86_400_000;

/** Fenêtre de `days` jours civils UTC se terminant aujourd'hui (inclus) : début et clés `AAAA-MM-JJ`. */
export function statsWindow(days: number, now = new Date()): { since: Date; dayKeys: string[] } {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const since = new Date(today - (days - 1) * DAY_MS);
  const dayKeys = Array.from({ length: days }, (_, i) =>
    new Date(since.getTime() + i * DAY_MS).toISOString().slice(0, 10),
  );
  return { since, dayKeys };
}

export interface DailyStats {
  date: string;
  visits: number;
  playStarts: number;
  playCompletes: number;
}

/** Complète les jours sans événement par des zéros (courbe continue, export régulier). */
export function fillDaily(dayKeys: string[], rows: DailyStats[]): DailyStats[] {
  const byDay = new Map(rows.map((r) => [r.date, r]));
  return dayKeys.map(
    (date) => byDay.get(date) ?? { date, visits: 0, playStarts: 0, playCompletes: 0 },
  );
}

// ——— Export CSV ———

/** CSV RFC 4180 ; les cellules commençant par = + - @ sont neutralisées (injection de formules). */
export function toCsv(header: string[], rows: Array<Array<string | number>>): string {
  const cell = (value: string | number): string => {
    let text = String(value);
    if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
