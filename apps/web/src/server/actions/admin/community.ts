'use server';

import {
  adminListQuerySchema,
  adminUserSchema,
  auditEntrySchema,
  contactMessageSchema,
  cursorQuerySchema,
  idSchema,
  pageSchema,
  reportListQuerySchema,
  reportSchema,
  reportUpdateInputSchema,
  roleInputSchema,
  userStatusInputSchema,
  type AdminUser,
  type AuditEntry,
  type ContactMessage,
  type Page,
  type Report,
} from '@ecine/contracts';
import { z } from 'zod';
import { privateRequest } from '../../api-client';
import { invalid, type ActionResult } from '../result';
import { adminMutation, adminQuery, enc } from './core';

/** Communauté et suivi : signalements, messages de contact, comptes et rôles, journal d'audit. */

const nextCursor = z.string().min(1).max(512);

// ——— Signalements (MODERATOR) ———

export async function updateReportAction(id: string, input: unknown): Promise<ActionResult> {
  const i = idSchema.safeParse(id);
  const body = reportUpdateInputSchema.safeParse(input);
  if (!i.success) return invalid(i.error);
  if (!body.success) return invalid(body.error);
  return adminMutation(async () => {
    await privateRequest(reportSchema, `/admin/reports/${enc(i.data)}`, {
      method: 'PATCH',
      body: body.data,
    });
    return null;
  }, ['/admin/signalements', '/admin']);
}

export async function loadReportsAction(query: unknown): Promise<ActionResult<Page<Report>>> {
  const parsed = reportListQuerySchema
    .pick({ state: true })
    .extend({ cursor: nextCursor })
    .safeParse(query);
  if (!parsed.success) return invalid(parsed.error);
  return adminQuery(() =>
    privateRequest(pageSchema(reportSchema), '/admin/reports', {
      query: { ...parsed.data, limit: 25 },
    }),
  );
}

// ——— Messages de contact (EDITOR) ———

export async function markMessageHandledAction(id: string): Promise<ActionResult> {
  const i = idSchema.safeParse(id);
  if (!i.success) return invalid(i.error);
  return adminMutation(async () => {
    await privateRequest(contactMessageSchema, `/admin/contact-messages/${enc(i.data)}/handled`, {
      method: 'PATCH',
    });
    return null;
  }, ['/admin/messages', '/admin']);
}

export async function loadMessagesAction(
  cursor: string,
): Promise<ActionResult<Page<ContactMessage>>> {
  const parsed = cursorQuerySchema.safeParse({ cursor, limit: 25 });
  if (!parsed.success || !parsed.data.cursor)
    return { ok: false, code: 'validation', error: 'Curseur invalide.' };
  return adminQuery(() =>
    privateRequest(pageSchema(contactMessageSchema), '/admin/contact-messages', {
      query: parsed.data,
    }),
  );
}

// ——— Comptes et rôles (ADMIN) ———

export async function setUserRoleAction(
  id: string,
  input: unknown,
): Promise<ActionResult<AdminUser>> {
  const i = idSchema.safeParse(id);
  const body = roleInputSchema.safeParse(input);
  if (!i.success) return invalid(i.error);
  if (!body.success) return invalid(body.error);
  return adminMutation(
    () =>
      privateRequest(adminUserSchema, `/admin/users/${enc(i.data)}/role`, {
        method: 'PATCH',
        body: body.data,
      }),
    ['/admin/utilisateurs'],
  );
}

export async function setUserStatusAction(
  id: string,
  input: unknown,
): Promise<ActionResult<AdminUser>> {
  const i = idSchema.safeParse(id);
  const body = userStatusInputSchema.safeParse(input);
  if (!i.success) return invalid(i.error);
  if (!body.success) return invalid(body.error);
  return adminMutation(
    () =>
      privateRequest(adminUserSchema, `/admin/users/${enc(i.data)}/status`, {
        method: 'PATCH',
        body: body.data,
      }),
    ['/admin/utilisateurs'],
  );
}

export async function loadUsersAction(query: unknown): Promise<ActionResult<Page<AdminUser>>> {
  const parsed = adminListQuerySchema
    .pick({ q: true })
    .extend({ cursor: nextCursor })
    .safeParse(query);
  if (!parsed.success) return invalid(parsed.error);
  return adminQuery(() =>
    privateRequest(pageSchema(adminUserSchema), '/admin/users', {
      query: { ...parsed.data, limit: 25 },
    }),
  );
}

// ——— Journal d'audit (ADMIN) ———

export async function loadAuditAction(cursor: string): Promise<ActionResult<Page<AuditEntry>>> {
  const parsed = cursorQuerySchema.safeParse({ cursor, limit: 50 });
  if (!parsed.success || !parsed.data.cursor)
    return { ok: false, code: 'validation', error: 'Curseur invalide.' };
  return adminQuery(() =>
    privateRequest(pageSchema(auditEntrySchema), '/admin/audit-log', { query: parsed.data }),
  );
}
