import { Inject, Injectable } from '@nestjs/common';
import { hasRole, type Me, type TwoFactorSetup, type UpdateMeInput } from '@ecine/contracts';
import { ENV, type Env } from '../config/env.js';
import { openSecret, sealSecret } from '../common/crypto.js';
import { ProblemException } from '../common/problem.js';
import { AuditService } from '../audit/audit.service.js';
import { AuthService, toMe } from '../auth/auth.service.js';
import { PasswordService } from '../auth/password.service.js';
import { SessionService } from '../auth/session.service.js';
import { generateTotpSecret, otpauthUrl } from '../auth/totp.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';

const PENDING_2FA_TTL_SEC = 10 * 60;

@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async get(userId: string): Promise<Me> {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw ProblemException.unauthorized();
    return toMe(user);
  }

  async update(userId: string, input: UpdateMeInput): Promise<Me> {
    const user = await this.prisma.user.update({ where: { id: userId }, data: input });
    return toMe(user);
  }

  async changePassword(userId: string, current: string, next: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await this.passwords.verify(user.passwordHash, current))) {
      throw ProblemException.badRequest('Mot de passe actuel incorrect.', [
        { path: 'currentPassword', message: 'Mot de passe incorrect' },
      ]);
    }
    this.passwords.assertAcceptable(next, user.email);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await this.passwords.hash(next) },
    });
    await this.sessions.revokeAllForUser(userId);
  }

  /** Export des données personnelles (droit d'accès et de portabilité). */
  async exportData(userId: string): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        email: true,
        displayName: true,
        locale: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        likes: { select: { targetType: true, targetId: true, createdAt: true } },
        bookmarks: { select: { film: { select: { slug: true } }, createdAt: true } },
        progress: {
          select: { film: { select: { slug: true } }, positionSec: true, updatedAt: true },
        },
        sessions: {
          select: { userAgent: true, createdAt: true, expiresAt: true, revokedAt: true },
        },
        reports: { select: { targetType: true, targetId: true, reason: true, createdAt: true } },
      },
    });
    const consents = await this.prisma.consentRecord.findMany({
      where: { userId },
      select: { version: true, categories: true, createdAt: true },
    });
    return { exportedAt: new Date().toISOString(), profile: user, consents };
  }

  /**
   * Suppression du compte : effacement des données personnelles et anonymisation des journaux.
   * Les comptes d'administration doivent d'abord être rétrogradés (évite de verrouiller l'administration).
   */
  async delete(userId: string, password: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await this.passwords.verify(user.passwordHash, password))) {
      throw ProblemException.badRequest('Mot de passe incorrect.', [
        { path: 'password', message: 'Mot de passe incorrect' },
      ]);
    }
    if (hasRole(user.role, 'MODERATOR')) {
      throw ProblemException.forbidden(
        'Un compte d’équipe doit être rétrogradé par un administrateur avant suppression.',
      );
    }
    await this.sessions.revokeAllForUser(userId);
    await this.prisma.$transaction([
      this.prisma.session.deleteMany({ where: { userId } }),
      this.prisma.emailToken.deleteMany({ where: { userId } }),
      this.prisma.like.deleteMany({ where: { userId } }),
      this.prisma.bookmark.deleteMany({ where: { userId } }),
      this.prisma.watchProgress.deleteMany({ where: { userId } }),
      this.prisma.report.updateMany({ where: { reporterId: userId }, data: { reporterId: null } }),
      this.prisma.consentRecord.updateMany({ where: { userId }, data: { userId: null } }),
      this.prisma.contactMessage.deleteMany({ where: { email: user.email } }),
      this.prisma.auditLog.updateMany({
        where: { actorId: userId },
        data: { actorId: null, ipHash: null },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          email: `supprime-${userId}@compte.invalid`,
          displayName: 'Compte supprimé',
          passwordHash: null,
          twoFactorSecretEnc: null,
          twoFactorEnabledAt: null,
          emailVerified: null,
          deletedAt: new Date(),
        },
      }),
    ]);
  }

  // ——— Double authentification ———

  async setupTwoFactor(userId: string): Promise<TwoFactorSetup> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.twoFactorEnabledAt)
      throw ProblemException.conflict('La double authentification est déjà active.');
    const secret = generateTotpSecret();
    await this.redis.client.set(
      `sess:2fa-setup:${userId}`,
      sealSecret(Buffer.from(secret), this.env.MEDIA_KEY_SECRET),
      'EX',
      PENDING_2FA_TTL_SEC,
    );
    return { secret, otpauthUrl: otpauthUrl(secret, user.email) };
  }

  async enableTwoFactor(userId: string, code: string): Promise<void> {
    const sealed = await this.redis.client.get(`sess:2fa-setup:${userId}`);
    if (!sealed) throw ProblemException.badRequest('Configuration expirée. Recommencez.');
    const secret = openSecret(sealed, this.env.MEDIA_KEY_SECRET).toString('utf8');
    if (!(await this.auth.consumeTotp(userId, secret, code))) {
      throw ProblemException.badRequest('Code incorrect.', [
        { path: 'code', message: 'Code incorrect' },
      ]);
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecretEnc: sealSecret(Buffer.from(secret), this.env.MEDIA_KEY_SECRET),
        twoFactorEnabledAt: new Date(),
      },
    });
    await this.redis.client.del(`sess:2fa-setup:${userId}`);
    await this.audit.log(null, {
      actorId: userId,
      action: 'auth.2fa_enabled',
      entity: 'User',
      entityId: userId,
    });
    // Les sessions existantes n'ont pas validé le second facteur : reconnexion exigée.
    await this.sessions.revokeAllForUser(userId);
  }

  async disableTwoFactor(userId: string, password: string, code: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.twoFactorSecretEnc)
      throw ProblemException.conflict('La double authentification n’est pas active.');
    if (hasRole(user.role, 'ADMIN') && this.env.ADMIN_MFA_REQUIRED) {
      throw ProblemException.forbidden(
        'La double authentification est obligatoire pour les administrateurs.',
      );
    }
    const secret = openSecret(user.twoFactorSecretEnc, this.env.MEDIA_KEY_SECRET).toString('utf8');
    const ok =
      (await this.passwords.verify(user.passwordHash, password)) &&
      (await this.auth.consumeTotp(userId, secret, code));
    if (!ok) throw ProblemException.badRequest('Mot de passe ou code incorrect.');
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecretEnc: null, twoFactorEnabledAt: null },
    });
    await this.audit.log(null, {
      actorId: userId,
      action: 'auth.2fa_disabled',
      entity: 'User',
      entityId: userId,
    });
  }
}
