import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  adminListQuerySchema,
  adminPersonSchema,
  adminRowSchema,
  confirmQuerySchema,
  idSchema,
  pageSchema,
  personInputSchema,
  publishCheckSchema,
  type AdminListQuery,
  type AdminPerson,
  type AdminRow,
  type Page,
  type PersonInput,
  type PublishCheck,
} from '@ecine/contracts';
import type { z } from 'zod';
import { BodySchema, QuerySchema, Returns } from '../common/contract.decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { Roles } from '../auth/decorators.js';
import { ConfirmDeletionPipe } from './admin.helpers.js';
import { AdminPeopleService } from './people.service.js';

@ApiTags('admin')
@Roles('EDITOR')
@Controller('admin/people')
export class AdminPeopleController {
  constructor(private readonly people: AdminPeopleService) {}

  @Get()
  @QuerySchema(adminListQuerySchema)
  @Returns(pageSchema(adminRowSchema))
  list(@Query(new ZodPipe(adminListQuerySchema)) q: AdminListQuery): Promise<Page<AdminRow>> {
    return this.people.list(q);
  }

  @Get(':id')
  @Returns(adminPersonSchema)
  get(@Param('id', new ZodPipe(idSchema)) id: string): Promise<AdminPerson> {
    return this.people.get(id);
  }

  @Post()
  @BodySchema(personInputSchema)
  @Returns(adminPersonSchema)
  create(
    @Body(new ZodPipe(personInputSchema)) input: PersonInput,
    @Req() req: Request,
  ): Promise<AdminPerson> {
    return this.people.create(req, input);
  }

  @Patch(':id')
  @BodySchema(personInputSchema)
  @Returns(adminPersonSchema)
  update(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Body(new ZodPipe(personInputSchema)) input: PersonInput,
    @Req() req: Request,
  ): Promise<AdminPerson> {
    return this.people.update(req, id, input);
  }

  @Delete(':id')
  @HttpCode(204)
  @QuerySchema(confirmQuerySchema)
  remove(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Query(new ConfirmDeletionPipe()) _confirm: z.infer<typeof confirmQuerySchema>,
    @Req() req: Request,
  ): Promise<void> {
    return this.people.remove(req, id);
  }

  @Post(':id/restore')
  @HttpCode(200)
  @Returns(adminPersonSchema)
  restore(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Req() req: Request,
  ): Promise<AdminPerson> {
    return this.people.restore(req, id);
  }

  @Get(':id/publish-check')
  @Returns(publishCheckSchema)
  check(@Param('id', new ZodPipe(idSchema)) id: string): Promise<PublishCheck> {
    return this.people.check(id);
  }

  @Post(':id/publish')
  @HttpCode(200)
  @Returns(adminPersonSchema)
  publish(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Req() req: Request,
  ): Promise<AdminPerson> {
    return this.people.publish(req, id);
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  @Returns(adminPersonSchema)
  unpublish(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Req() req: Request,
  ): Promise<AdminPerson> {
    return this.people.unpublish(req, id);
  }
}
