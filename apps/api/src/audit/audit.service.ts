import { Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ENV, type Env } from '../config/env.js';
import { hashIp } from '../common/crypto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';

/** Journal d'audit : qui, quoi, quand, avant/après. Aucune donnée secrète dans `meta`. */
@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async log(
    req: Request | null,
    entry: {
      action: string;
      entity: string;
      entityId?: string | null;
      meta?: Prisma.InputJsonValue;
      actorId?: string | null;
    },
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? req?.user?.id ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        meta: entry.meta,
        ipHash: req ? hashIp(req.clientIp ?? req.ip, this.env.IP_HASH_SALT) : null,
      },
    });
  }
}
