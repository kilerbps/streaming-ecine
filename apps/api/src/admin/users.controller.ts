import { Body, Controller, Get, Param, Patch, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  adminListQuerySchema,
  adminUserSchema,
  idSchema,
  pageSchema,
  roleInputSchema,
  userStatusInputSchema,
  type AdminListQuery,
  type AdminUser,
  type Page,
} from '@ecine/contracts';
import type { z } from 'zod';
import { BodySchema, QuerySchema, Returns } from '../common/contract.decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { AdminUsersService } from './users.service.js';

@ApiTags('admin')
@Roles('ADMIN')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  @QuerySchema(adminListQuerySchema)
  @Returns(pageSchema(adminUserSchema))
  list(@Query(new ZodPipe(adminListQuerySchema)) q: AdminListQuery): Promise<Page<AdminUser>> {
    return this.users.list(q);
  }

  /** Rôle : matrice role-policy.ts (SUPER_ADMIN attribuable par un SUPER_ADMIN seulement). */
  @Patch(':id/role')
  @BodySchema(roleInputSchema)
  @Returns(adminUserSchema)
  setRole(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Body(new ZodPipe(roleInputSchema)) input: z.infer<typeof roleInputSchema>,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
  ): Promise<AdminUser> {
    return this.users.setRole(req, actor, id, input.role);
  }

  /** Désactivation (révoque toutes les sessions) ou réactivation. */
  @Patch(':id/status')
  @BodySchema(userStatusInputSchema)
  @Returns(adminUserSchema)
  setStatus(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Body(new ZodPipe(userStatusInputSchema)) input: z.infer<typeof userStatusInputSchema>,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
  ): Promise<AdminUser> {
    return this.users.setStatus(req, actor, id, input.disabled);
  }
}
