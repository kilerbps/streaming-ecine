import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import {
  ROLE_RANK,
  type AdminListQuery,
  type AdminUser,
  type Page,
  type Role,
} from '@ecine/contracts';
import { AuditService } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/auth.types.js';
import { SessionService } from '../auth/session.service.js';
import { iso } from '../content/content.helpers.js';
import { ProblemException } from '../common/problem.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { containsInsensitive, createdBefore, decodeAdminCursor, pageOf } from './admin.helpers.js';
import { canAssignRole, canChangeStatus, type PolicyDecision } from './role-policy.js';

/** Champs exposés à l'administration : jamais de hachage, de secret TOTP ni de jeton. */
const adminUserSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  emailVerified: true,
  twoFactorEnabledAt: true,
  disabledAt: true,
  createdAt: true,
} as const;

interface AdminUserRow {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  emailVerified: Date | null;
  twoFactorEnabledAt: Date | null;
  disabledAt: Date | null;
  createdAt: Date;
}

function toAdmin(user: AdminUserRow): AdminUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    emailVerified: Boolean(user.emailVerified),
    twoFactorEnabled: Boolean(user.twoFactorEnabledAt),
    disabledAt: iso(user.disabledAt),
    createdAt: user.createdAt.toISOString(),
  };
}

function enforce(decision: PolicyDecision): void {
  if (!decision.allowed) throw ProblemException.forbidden(decision.reason);
}

/**
 * Comptes et rôles (FR-103). Les règles d'autorisation sont dans role-policy.ts (fonction pure testée) ;
 * le rôle de l'acteur est celui relu en base par RolesGuard.
 */
@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
  ) {}

  async list(q: AdminListQuery): Promise<Page<AdminUser>> {
    const rows = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(q.q ? { email: containsInsensitive(q.q) } : {}),
        ...createdBefore(decodeAdminCursor(q.cursor)),
      },
      select: adminUserSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: q.limit + 1,
    });
    return pageOf(rows, q.limit, (u) => u.createdAt, toAdmin);
  }

  async setRole(req: Request, actor: AuthUser, id: string, role: Role): Promise<AdminUser> {
    const target = await this.load(id);
    enforce(canAssignRole(actor, target, role));
    if (target.role === role) return toAdmin(target);

    // Mise à jour conditionnelle : refus si le rôle a changé entre la lecture et l'écriture.
    const { count } = await this.prisma.user.updateMany({
      where: { id, role: target.role, deletedAt: null },
      data: { role },
    });
    if (count === 0)
      throw ProblemException.conflict('Ce compte a été modifié entre-temps. Rechargez la page.');
    // Rétrogradation : sessions révoquées (aucun jeton ne garde l'ancien rôle, durée de session recalculée).
    const demoted = ROLE_RANK[role] < ROLE_RANK[target.role];
    if (demoted) await this.sessions.revokeAllForUser(id);

    await this.audit.log(req, {
      action: 'user.role',
      entity: 'User',
      entityId: id,
      meta: { before: { role: target.role }, after: { role }, sessionsRevoked: demoted },
    });
    return toAdmin(await this.load(id));
  }

  async setStatus(
    req: Request,
    actor: AuthUser,
    id: string,
    disabled: boolean,
  ): Promise<AdminUser> {
    const target = await this.load(id);
    enforce(canChangeStatus(actor, target));
    if (disabled === Boolean(target.disabledAt)) return toAdmin(target);

    await this.prisma.user.update({
      where: { id },
      data: { disabledAt: disabled ? new Date() : null },
    });
    // Désactivation : déconnexion immédiate sur tous les appareils.
    if (disabled) await this.sessions.revokeAllForUser(id);

    await this.audit.log(req, {
      action: disabled ? 'user.disable' : 'user.enable',
      entity: 'User',
      entityId: id,
      meta: { before: { disabled: !disabled }, after: { disabled } },
    });
    return toAdmin(await this.load(id));
  }

  private async load(id: string): Promise<AdminUserRow> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: adminUserSelect,
    });
    if (!user) throw ProblemException.notFound('Ce compte est introuvable.');
    return user;
  }
}
