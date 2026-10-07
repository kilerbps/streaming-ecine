import { Inject, Injectable, Logger } from '@nestjs/common';
import { hasRole } from '@ecine/contracts';
import { ENV, type Env } from '../config/env.js';
import { hashIp, randomToken, sha256 } from '../common/crypto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import type { Role } from '../generated/prisma/enums.js';
import {
  ACCESS_TTL_SEC,
  ADMIN_REFRESH_TTL_SEC,
  REFRESH_TTL_SEC,
  TokensService,
} from './tokens.service.js';

/** Fenêtre pendant laquelle un refresh déjà tourné reste accepté (requêtes concurrentes du même onglet). */
const ROTATION_GRACE_MS = 20_000;

export interface IssuedTokens {
  access: string;
  accessTtlSec: number;
  refresh: string;
  refreshTtlSec: number;
}

export interface ClientInfo {
  ip?: string;
  userAgent?: string;
}

/**
 * Sessions à refresh tournant : usage unique, stockage haché, détection de rejeu (famille révoquée),
 * révocation immédiate des jetons d'accès via `sess:revoked:{famille}`.
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly tokens: TokensService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async create(
    user: { id: string; role: Role },
    mfa: boolean,
    client: ClientInfo,
    family = randomToken(16),
  ): Promise<IssuedTokens> {
    const refresh = randomToken();
    const refreshTtlSec = hasRole(user.role, 'ADMIN') ? ADMIN_REFRESH_TTL_SEC : REFRESH_TTL_SEC;
    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refresh),
        family,
        mfa,
        userAgent: client.userAgent?.slice(0, 255) ?? null,
        ipHash: hashIp(client.ip, this.env.IP_HASH_SALT),
        expiresAt: new Date(Date.now() + refreshTtlSec * 1000),
      },
    });
    const access = await this.tokens.signAccess({ id: user.id, role: user.role, family, mfa });
    return { access, accessTtlSec: ACCESS_TTL_SEC, refresh, refreshTtlSec };
  }

  /** Échange un refresh valide contre une nouvelle paire. Retourne null si refusé (et révoque en cas de rejeu). */
  async rotate(refreshToken: string, client: ClientInfo): Promise<IssuedTokens | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: sha256(refreshToken) },
      include: { user: { select: { id: true, role: true, disabledAt: true, deletedAt: true } } },
    });
    if (!session) return null;
    const { user } = session;
    if (user.disabledAt || user.deletedAt || session.expiresAt <= new Date()) return null;

    if (session.revokedAt) {
      const withinGrace =
        session.rotatedAt && Date.now() - session.rotatedAt.getTime() < ROTATION_GRACE_MS;
      if (!withinGrace) {
        this.logger.warn(
          { family: session.family.slice(0, 6) },
          'Rejeu de refresh token détecté : famille révoquée',
        );
        await this.revokeFamily(session.family);
        await this.prisma.auditLog.create({
          data: {
            actorId: user.id,
            action: 'auth.refresh_reuse',
            entity: 'Session',
            entityId: session.id,
          },
        });
        return null;
      }
    } else {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date(), rotatedAt: new Date() },
      });
    }
    // Le second facteur validé à la connexion reste acquis pour la famille.
    return this.create(user, session.mfa, client, session.family);
  }

  async revokeFamily(family: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.redis.client
      .set(`sess:revoked:${family}`, '1', 'EX', ACCESS_TTL_SEC)
      .catch(() => undefined);
  }

  async revokeAllForUser(userId: string): Promise<void> {
    const families = await this.prisma.session.findMany({
      where: { userId, revokedAt: null },
      select: { family: true },
      distinct: ['family'],
    });
    await Promise.all(families.map((f) => this.revokeFamily(f.family)));
  }

  async revokeByRefresh(refreshToken: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: sha256(refreshToken) },
      select: { family: true },
    });
    if (session) await this.revokeFamily(session.family);
  }

  /** Vrai si la famille a été révoquée (Redis, avec repli sur la base si Redis est indisponible). */
  async isFamilyRevoked(family: string): Promise<boolean> {
    if (this.redis.ready) {
      try {
        if ((await this.redis.client.exists(`sess:revoked:${family}`)) === 1) return true;
        return false;
      } catch {
        // repli base ci-dessous
      }
    }
    const active = await this.prisma.session.count({
      where: { family, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    return active === 0;
  }
}
