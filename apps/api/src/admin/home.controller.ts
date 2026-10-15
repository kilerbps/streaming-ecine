import { Body, Controller, Get, Put, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { adminHomeSchema, homeInputSchema, type AdminHome, type HomeInput } from '@ecine/contracts';
import { Roles } from '../auth/decorators.js';
import { BodySchema, Returns } from '../common/contract.decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { AdminHomeService } from './home.service.js';

/** Programmation de l'accueil : Éditeur et Administrateur (docs/design/05-admin.md). */
@ApiTags('admin')
@Roles('EDITOR')
@Controller('admin/home')
export class AdminHomeController {
  constructor(private readonly home: AdminHomeService) {}

  @Get()
  @Returns(adminHomeSchema)
  get(): Promise<AdminHome> {
    return this.home.get();
  }

  @Put()
  @BodySchema(homeInputSchema)
  @Returns(adminHomeSchema)
  update(
    @Body(new ZodPipe(homeInputSchema)) input: HomeInput,
    @Req() req: Request,
  ): Promise<AdminHome> {
    return this.home.update(req, input);
  }
}
