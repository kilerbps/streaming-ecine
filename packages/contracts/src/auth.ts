import { z } from 'zod';
import { localeSchema, roleSchema } from './common.js';

/** Mot de passe : longueur ≥ 12, pas de règle de composition (docs/06-SECURITY.md §3). */
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Au moins ${PASSWORD_MIN} caractères`)
  .max(PASSWORD_MAX, `Au plus ${PASSWORD_MAX} caractères`);

/** Nettoyée (espaces, majuscules) avant validation : une adresse copiée-collée reste acceptée. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Adresse e-mail invalide').max(254, 'Adresse e-mail trop longue'));

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, 'Au moins 2 caractères')
  .max(60, 'Au plus 60 caractères');

export const registerInputSchema = z.strictObject({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
  acceptTerms: z.literal(true, { error: 'Vous devez accepter les conditions générales' }),
  /** Jeton Cloudflare Turnstile. */
  turnstileToken: z.string().max(4096).optional(),
  /** Pot de miel : doit rester vide. */
  website: z.string().max(0).optional(),
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1, 'Mot de passe requis').max(PASSWORD_MAX),
  totp: z
    .string()
    .regex(/^\d{6}$/, 'Code à 6 chiffres')
    .optional(),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const verifyEmailInputSchema = z.strictObject({ token: z.string().min(16).max(256) });
export const forgotPasswordInputSchema = z.strictObject({ email: emailSchema });
export const resetPasswordInputSchema = z.strictObject({
  token: z.string().min(16).max(256),
  password: passwordSchema,
});

export const preferencesSchema = z.strictObject({
  theme: z.enum(['dark', 'light']).optional(),
  sound: z.boolean().optional(),
  saveData: z.boolean().optional(),
});
export type Preferences = z.infer<typeof preferencesSchema>;

export const meSchema = z.object({
  id: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  displayName: z.string(),
  role: roleSchema,
  locale: localeSchema,
  twoFactorEnabled: z.boolean(),
  createdAt: z.string(),
});
export type Me = z.infer<typeof meSchema>;

export const updateMeInputSchema = z.strictObject({
  displayName: displayNameSchema.optional(),
  locale: localeSchema.optional(),
});
export type UpdateMeInput = z.infer<typeof updateMeInputSchema>;

export const deleteMeInputSchema = z.strictObject({
  password: z.string().min(1).max(PASSWORD_MAX),
  confirm: z.literal(true),
});

export const changePasswordInputSchema = z.strictObject({
  currentPassword: z.string().min(1).max(PASSWORD_MAX),
  newPassword: passwordSchema,
});

/** Double authentification (TOTP, RFC 6238) — obligatoire pour ADMIN et SUPER_ADMIN. */
export const totpCodeSchema = z.string().regex(/^\d{6}$/, 'Code à 6 chiffres');
export const twoFactorSetupSchema = z.object({ secret: z.string(), otpauthUrl: z.string() });
export type TwoFactorSetup = z.infer<typeof twoFactorSetupSchema>;
export const twoFactorEnableInputSchema = z.strictObject({ code: totpCodeSchema });
export const twoFactorDisableInputSchema = z.strictObject({
  password: z.string().min(1).max(PASSWORD_MAX),
  code: totpCodeSchema,
});

/** Réponse de connexion : les jetons sont dans des cookies HttpOnly, jamais dans le corps. */
export const authResultSchema = z.object({ user: meSchema });
export type AuthResult = z.infer<typeof authResultSchema>;

/** Noms des cookies d'authentification (partagés API ↔ web). */
export const AUTH_COOKIES = {
  access: 'ecine_at',
  refresh: 'ecine_rt',
  csrf: 'ecine_csrf',
} as const;
export const CSRF_HEADER = 'x-csrf-token';
