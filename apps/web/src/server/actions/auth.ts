'use server';

import { cookies } from 'next/headers';
import {
  authResultSchema,
  changePasswordInputSchema,
  deleteMeInputSchema,
  forgotPasswordInputSchema,
  loginInputSchema,
  meSchema,
  registerInputSchema,
  resetPasswordInputSchema,
  twoFactorEnableInputSchema,
  twoFactorSetupSchema,
  updateMeInputSchema,
  verifyEmailInputSchema,
  type Me,
  type TwoFactorSetup,
} from '@ecine/contracts';
import { privateRequest } from '../api-client';
import { serverConfig } from '../config';
import { authCookieNames } from '../cookie-names';
import { fromError, invalid, ok, type ActionResult } from './result';

export async function loginAction(input: unknown): Promise<ActionResult<Me>> {
  const parsed = loginInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const res = await privateRequest(authResultSchema, '/auth/login', {
      method: 'POST',
      body: parsed.data,
      relayCookies: true,
    });
    return ok(res.user);
  } catch (error) {
    return fromError(error);
  }
}

export async function registerAction(input: unknown): Promise<ActionResult<Me>> {
  const parsed = registerInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const res = await privateRequest(authResultSchema, '/auth/register', {
      method: 'POST',
      body: parsed.data,
      relayCookies: true,
    });
    return ok(res.user);
  } catch (error) {
    return fromError(error);
  }
}

/** Déconnexion propre : révocation côté API puis effacement des cookies, même si l'API est injoignable. */
export async function logoutAction(): Promise<ActionResult> {
  try {
    await privateRequest(null, '/auth/logout', { method: 'POST', relayCookies: true });
  } catch {
    // La suppression locale ci-dessous a lieu dans tous les cas.
  }
  const jar = await cookies();
  const names = authCookieNames(serverConfig().COOKIE_SECURE);
  jar.delete(names.access);
  jar.delete(names.refresh);
  return ok(null);
}

export async function forgotPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    await privateRequest(null, '/auth/forgot-password', { method: 'POST', body: parsed.data });
    return ok(null);
  } catch (error) {
    return fromError(error);
  }
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    await privateRequest(null, '/auth/reset-password', { method: 'POST', body: parsed.data });
    return ok(null);
  } catch (error) {
    return fromError(error);
  }
}

export async function verifyEmailAction(token: string): Promise<ActionResult> {
  const parsed = verifyEmailInputSchema.safeParse({ token });
  if (!parsed.success) return invalid(parsed.error);
  try {
    await privateRequest(null, '/auth/verify-email', { method: 'POST', body: parsed.data });
    return ok(null);
  } catch (error) {
    return fromError(error);
  }
}

export async function resendVerificationAction(): Promise<ActionResult> {
  try {
    await privateRequest(null, '/me/resend-verification', { method: 'POST' });
    return ok(null);
  } catch (error) {
    return fromError(error);
  }
}

export async function updateProfileAction(input: unknown): Promise<ActionResult<Me>> {
  const parsed = updateMeInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    return ok(await privateRequest(meSchema, '/me', { method: 'PATCH', body: parsed.data }));
  } catch (error) {
    return fromError(error);
  }
}

export async function changePasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = changePasswordInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    await privateRequest(null, '/me/password', {
      method: 'POST',
      body: parsed.data,
      relayCookies: true,
    });
    return ok(null);
  } catch (error) {
    return fromError(error);
  }
}

export async function deleteAccountAction(input: unknown): Promise<ActionResult> {
  const parsed = deleteMeInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    await privateRequest(null, '/me', { method: 'DELETE', body: parsed.data, relayCookies: true });
    return ok(null);
  } catch (error) {
    return fromError(error);
  }
}

export async function setupTwoFactorAction(): Promise<ActionResult<TwoFactorSetup>> {
  try {
    return ok(await privateRequest(twoFactorSetupSchema, '/me/2fa/setup', { method: 'POST' }));
  } catch (error) {
    return fromError(error);
  }
}

export async function enableTwoFactorAction(input: unknown): Promise<ActionResult> {
  const parsed = twoFactorEnableInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    await privateRequest(null, '/me/2fa/enable', {
      method: 'POST',
      body: parsed.data,
      relayCookies: true,
    });
    return ok(null);
  } catch (error) {
    return fromError(error);
  }
}
