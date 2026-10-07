import { Inject, Injectable } from '@nestjs/common';
import {
  DEFAULT_LOCALE,
  hasRole,
  localeSchema,
  type LoginInput,
  type Me,
  type RegisterInput,
} from '@ecine/contracts';
import { ENV, type Env } from '../config/env.js';
import { CaptchaService } from '../common/captcha.service.js';
import { openSecret, randomToken, sha256 } from '../common/crypto.js';
import { PROBLEM_TYPES, ProblemException } from '../common/problem.js';
import { AuditService } from '../audit/audit.service.js';
import { MailService } from '../mail/mail.service.js';
import { mailTemplates } from '../mail/mail.templates.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import type { User } from '../generated/prisma/client.js';
import { LoginAttemptsService } from './login-attempts.service.js';
import { PasswordService } from './password.service.js';
import { type ClientInfo, type IssuedTokens, SessionService } from './session.service.js';
import { verifyTotp } from './totp.js';

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;
const INVALID_CREDENTIALS = 'E-mail ou mot de passe incorrect.';

export function toMe(user: User): Me {
  return {
    id: user.id,
    email: user.email,
    emailVerified: Boolean(user.emailVerified),
    displayName: user.displayName,
    role: user.role,
    locale: localeSchema.catch(DEFAULT_LOCALE).parse(user.locale),
    twoFactorEnabled: Boolean(user.twoFactorEnabledAt),
    createdAt: user.createdAt.toISOString(),
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly attempts: LoginAttemptsService,
    private readonly captcha: CaptchaService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async register(
    input: RegisterInput,
    client: ClientInfo,
  ): Promise<{ me: Me; tokens: IssuedTokens }> {
    await this.captcha.assertHuman(input.turnstileToken, client.ip);
    this.passwords.assertAcceptable(input.password, input.email);

    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existing) {
      // Choix documenté (ADR-0005) : message explicite plutôt qu'un faux succès, limité en débit + Turnstile.
      throw ProblemException.conflict(
        'Un compte existe déjà avec cette adresse. Connectez-vous ou réinitialisez votre mot de passe.',
      );
    }

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        displayName: input.displayName,
        passwordHash: await this.passwords.hash(input.password),
      },
    });
    await this.sendVerification(user);
    const tokens = await this.sessions.create(user, false, client);
    return { me: toMe(user), tokens };
  }

  async login(input: LoginInput, client: ClientInfo): Promise<{ me: Me; tokens: IssuedTokens }> {
    await this.attempts.assertAllowed(input.email);
    const user = await this.prisma.user.findFirst({
      where: { email: input.email, deletedAt: null },
    });
    const passwordOk = await this.passwords.verify(user?.passwordHash, input.password);

    if (!user || !passwordOk || user.disabledAt) {
      await this.attempts.recordFailure(input.email);
      throw ProblemException.unauthorized(INVALID_CREDENTIALS);
    }

    let mfa = false;
    if (user.twoFactorEnabledAt && user.twoFactorSecretEnc) {
      if (!input.totp) {
        throw new ProblemException({
          type: PROBLEM_TYPES.mfaRequired,
          title: 'Code de vérification requis',
          status: 401,
          detail: 'Saisissez le code à 6 chiffres de votre application d’authentification.',
        });
      }
      const secret = openSecret(user.twoFactorSecretEnc, this.env.MEDIA_KEY_SECRET).toString(
        'utf8',
      );
      if (!(await this.consumeTotp(user.id, secret, input.totp))) {
        await this.attempts.recordFailure(input.email);
        throw ProblemException.unauthorized('Code de vérification incorrect.');
      }
      mfa = true;
    }

    await this.attempts.reset(input.email);
    const tokens = await this.sessions.create(user, mfa, client);
    if (hasRole(user.role, 'MODERATOR')) {
      await this.audit.log(null, {
        actorId: user.id,
        action: 'auth.login',
        entity: 'User',
        entityId: user.id,
        meta: { mfa },
      });
    }
    return { me: toMe(user), tokens };
  }

  /** Code TOTP à usage unique : un pas déjà consommé est refusé (anti-rejeu). */
  async consumeTotp(userId: string, secretB32: string, code: string): Promise<boolean> {
    const step = verifyTotp(secretB32, code);
    if (step === null) return false;
    const key = `sess:totp:${userId}:${step}`;
    try {
      const fresh = await this.redis.client.set(key, '1', 'EX', 120, 'NX');
      return fresh === 'OK';
    } catch {
      return true;
    }
  }

  async verifyEmail(token: string): Promise<void> {
    const record = await this.prisma.emailToken.findUnique({ where: { tokenHash: sha256(token) } });
    if (
      !record ||
      record.kind !== 'VERIFY_EMAIL' ||
      record.usedAt ||
      record.expiresAt <= new Date()
    ) {
      throw ProblemException.badRequest('Ce lien de confirmation est invalide ou expiré.');
    }
    await this.prisma.$transaction([
      this.prisma.emailToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: new Date() },
      }),
    ]);
  }

  async resendVerification(userId: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.emailVerified) await this.sendVerification(user);
  }

  /** Réponse identique que l'e-mail existe ou non. */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null, disabledAt: null },
    });
    if (!user) return;
    const token = randomToken();
    await this.prisma.emailToken.create({
      data: {
        userId: user.id,
        kind: 'RESET_PASSWORD',
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + RESET_TTL_MS),
      },
    });
    const link = `${this.env.APP_URL}/fr/compte/nouveau-mot-de-passe?token=${encodeURIComponent(token)}`;
    await this.mail.send(mailTemplates.resetPassword(user.email, link)).catch(() => undefined);
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const record = await this.prisma.emailToken.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: true },
    });
    if (
      !record ||
      record.kind !== 'RESET_PASSWORD' ||
      record.usedAt ||
      record.expiresAt <= new Date()
    ) {
      throw ProblemException.badRequest('Ce lien de réinitialisation est invalide ou expiré.');
    }
    this.passwords.assertAcceptable(password, record.user.email);
    await this.prisma.$transaction([
      this.prisma.emailToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: await this.passwords.hash(password) },
      }),
    ]);
    await this.sessions.revokeAllForUser(record.userId);
    await this.audit.log(null, {
      actorId: record.userId,
      action: 'auth.password_reset',
      entity: 'User',
      entityId: record.userId,
    });
  }

  private async sendVerification(user: User): Promise<void> {
    const token = randomToken();
    await this.prisma.emailToken.create({
      data: {
        userId: user.id,
        kind: 'VERIFY_EMAIL',
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + VERIFY_TTL_MS),
      },
    });
    const link = `${this.env.APP_URL}/fr/compte/verifier?token=${encodeURIComponent(token)}`;
    await this.mail
      .send(mailTemplates.verifyEmail(user.email, user.displayName, link))
      .catch(() => undefined);
  }
}
