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
  adminCategorySchema,
  adminListQuerySchema,
  adminRowSchema,
  adminStaticPageSchema,
  adminTeamMemberSchema,
  categoryInputSchema,
  confirmQuerySchema,
  idSchema,
  pageSchema,
  publishCheckSchema,
  redirectInputSchema,
  redirectSchema,
  siteSettingsInputSchema,
  siteSettingsSchema,
  staticPageInputSchema,
  teamMemberInputSchema,
  type AdminCategory,
  type AdminListQuery,
  type AdminRow,
  type AdminStaticPage,
  type AdminTeamMember,
  type Page,
  type PublishCheck,
  type Redirect,
  type SiteSettings,
} from '@ecine/contracts';
import { z } from 'zod';
import { BodySchema, QuerySchema, Returns } from '../common/contract.decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { Roles } from '../auth/decorators.js';
import { ConfirmDeletionPipe } from './admin.helpers.js';
import { AdminCategoriesService } from './categories.service.js';
import { AdminPagesService } from './pages.service.js';
import { AdminSettingsService } from './settings.service.js';
import { AdminTeamService } from './team.service.js';

type Confirm = z.infer<typeof confirmQuerySchema>;

@ApiTags('admin')
@Roles('EDITOR')
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly categories: AdminCategoriesService) {}

  @Get()
  @Returns(z.array(adminCategorySchema))
  list(): Promise<AdminCategory[]> {
    return this.categories.list();
  }

  @Post()
  @BodySchema(categoryInputSchema)
  @Returns(adminCategorySchema)
  create(
    @Body(new ZodPipe(categoryInputSchema)) input: z.infer<typeof categoryInputSchema>,
    @Req() req: Request,
  ): Promise<AdminCategory> {
    return this.categories.create(req, input);
  }

  @Patch(':id')
  @BodySchema(categoryInputSchema)
  @Returns(adminCategorySchema)
  update(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Body(new ZodPipe(categoryInputSchema)) input: z.infer<typeof categoryInputSchema>,
    @Req() req: Request,
  ): Promise<AdminCategory> {
    return this.categories.update(req, id, input);
  }

  @Delete(':id')
  @HttpCode(204)
  @QuerySchema(confirmQuerySchema)
  remove(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Query(new ConfirmDeletionPipe()) _confirm: Confirm,
    @Req() req: Request,
  ): Promise<void> {
    return this.categories.remove(req, id);
  }
}

@ApiTags('admin')
@Roles('EDITOR')
@Controller('admin/team')
export class AdminTeamController {
  constructor(private readonly team: AdminTeamService) {}

  @Get()
  @Returns(z.array(adminTeamMemberSchema))
  list(): Promise<AdminTeamMember[]> {
    return this.team.list();
  }

  @Post()
  @BodySchema(teamMemberInputSchema)
  @Returns(adminTeamMemberSchema)
  create(
    @Body(new ZodPipe(teamMemberInputSchema)) input: z.infer<typeof teamMemberInputSchema>,
    @Req() req: Request,
  ): Promise<AdminTeamMember> {
    return this.team.create(req, input);
  }

  @Patch(':id')
  @BodySchema(teamMemberInputSchema)
  @Returns(adminTeamMemberSchema)
  update(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Body(new ZodPipe(teamMemberInputSchema)) input: z.infer<typeof teamMemberInputSchema>,
    @Req() req: Request,
  ): Promise<AdminTeamMember> {
    return this.team.update(req, id, input);
  }

  @Delete(':id')
  @HttpCode(204)
  @QuerySchema(confirmQuerySchema)
  remove(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Query(new ConfirmDeletionPipe()) _confirm: Confirm,
    @Req() req: Request,
  ): Promise<void> {
    return this.team.remove(req, id);
  }
}

@ApiTags('admin')
@Roles('EDITOR')
@Controller('admin/pages')
export class AdminPagesController {
  constructor(private readonly pages: AdminPagesService) {}

  @Get()
  @QuerySchema(adminListQuerySchema)
  @Returns(pageSchema(adminRowSchema))
  list(@Query(new ZodPipe(adminListQuerySchema)) q: AdminListQuery): Promise<Page<AdminRow>> {
    return this.pages.list(q);
  }

  @Get(':id')
  @Returns(adminStaticPageSchema)
  get(@Param('id', new ZodPipe(idSchema)) id: string): Promise<AdminStaticPage> {
    return this.pages.get(id);
  }

  @Post()
  @BodySchema(staticPageInputSchema)
  @Returns(adminStaticPageSchema)
  create(
    @Body(new ZodPipe(staticPageInputSchema)) input: z.infer<typeof staticPageInputSchema>,
    @Req() req: Request,
  ): Promise<AdminStaticPage> {
    return this.pages.create(req, input);
  }

  @Patch(':id')
  @BodySchema(staticPageInputSchema)
  @Returns(adminStaticPageSchema)
  update(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Body(new ZodPipe(staticPageInputSchema)) input: z.infer<typeof staticPageInputSchema>,
    @Req() req: Request,
  ): Promise<AdminStaticPage> {
    return this.pages.update(req, id, input);
  }

  @Get(':id/publish-check')
  @Returns(publishCheckSchema)
  check(@Param('id', new ZodPipe(idSchema)) id: string): Promise<PublishCheck> {
    return this.pages.check(id);
  }

  @Post(':id/publish')
  @HttpCode(200)
  @Returns(adminStaticPageSchema)
  publish(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Req() req: Request,
  ): Promise<AdminStaticPage> {
    return this.pages.publish(req, id);
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  @Returns(adminStaticPageSchema)
  unpublish(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Req() req: Request,
  ): Promise<AdminStaticPage> {
    return this.pages.unpublish(req, id);
  }
}

@ApiTags('admin')
@Roles('ADMIN')
@Controller('admin/site-settings')
export class AdminSettingsController {
  constructor(private readonly settings: AdminSettingsService) {}

  @Get()
  @Returns(siteSettingsSchema)
  get(): Promise<SiteSettings> {
    return this.settings.settings();
  }

  @Patch()
  @BodySchema(siteSettingsInputSchema)
  @Returns(siteSettingsSchema)
  update(
    @Body(new ZodPipe(siteSettingsInputSchema)) input: z.infer<typeof siteSettingsInputSchema>,
    @Req() req: Request,
  ): Promise<SiteSettings> {
    return this.settings.updateSettings(req, input);
  }
}

@ApiTags('admin')
@Roles('EDITOR')
@Controller('admin/redirects')
export class AdminRedirectsController {
  constructor(private readonly settings: AdminSettingsService) {}

  @Get()
  @QuerySchema(adminListQuerySchema)
  @Returns(pageSchema(redirectSchema))
  list(@Query(new ZodPipe(adminListQuerySchema)) q: AdminListQuery): Promise<Page<Redirect>> {
    return this.settings.redirects(q);
  }

  @Post()
  @BodySchema(redirectInputSchema)
  @Returns(redirectSchema)
  create(
    @Body(new ZodPipe(redirectInputSchema)) input: z.infer<typeof redirectInputSchema>,
    @Req() req: Request,
  ): Promise<Redirect> {
    return this.settings.createRedirect(req, input);
  }

  @Delete(':id')
  @HttpCode(204)
  @QuerySchema(confirmQuerySchema)
  remove(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Query(new ConfirmDeletionPipe()) _confirm: Confirm,
    @Req() req: Request,
  ): Promise<void> {
    return this.settings.removeRedirect(req, id);
  }
}
