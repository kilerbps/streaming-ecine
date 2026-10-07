import { type MiddlewareConsumer, Module, type NestModule, type Type } from '@nestjs/common';
import { noStore } from './admin.helpers.js';
import { AdminArticlesController } from './articles.controller.js';
import { AdminArticlesService } from './articles.service.js';
import { AdminCategoriesService } from './categories.service.js';
import { AdminFilmsController } from './films.controller.js';
import { AdminFilmsService } from './films.service.js';
import { AdminInsightsController } from './insights.controller.js';
import { AdminInsightsService } from './insights.service.js';
import { AdminContactMessagesController, AdminReportsController } from './moderation.controller.js';
import { AdminModerationService } from './moderation.service.js';
import { AdminPagesService } from './pages.service.js';
import { AdminPeopleController } from './people.controller.js';
import { AdminPeopleService } from './people.service.js';
import { AdminPostsController } from './posts.controller.js';
import { AdminPostsService } from './posts.service.js';
import { SchedulerService } from './scheduler.service.js';
import { AdminSettingsService } from './settings.service.js';
import {
  AdminCategoriesController,
  AdminPagesController,
  AdminRedirectsController,
  AdminSettingsController,
  AdminTeamController,
} from './site.controller.js';
import { AdminTeamService } from './team.service.js';
import { AdminUsersController } from './users.controller.js';
import { AdminUsersService } from './users.service.js';

const ADMIN_CONTROLLERS: Type[] = [
  AdminFilmsController,
  AdminPeopleController,
  AdminArticlesController,
  AdminPostsController,
  AdminCategoriesController,
  AdminTeamController,
  AdminPagesController,
  AdminSettingsController,
  AdminRedirectsController,
  AdminUsersController,
  AdminReportsController,
  AdminContactMessagesController,
  AdminInsightsController,
];

/**
 * Administration (docs/04-API-SPEC.md §3) : rôle minimum par contrôleur (RolesGuard relit le rôle en base
 * et impose la 2FA aux ADMIN+), audit de chaque écriture, invalidation des caches, réponses `no-store`.
 */
@Module({
  controllers: ADMIN_CONTROLLERS,
  providers: [
    AdminFilmsService,
    AdminPeopleService,
    AdminArticlesService,
    AdminPostsService,
    AdminCategoriesService,
    AdminTeamService,
    AdminPagesService,
    AdminSettingsService,
    AdminUsersService,
    AdminModerationService,
    AdminInsightsService,
    SchedulerService,
  ],
})
export class AdminModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(noStore).forRoutes(...ADMIN_CONTROLLERS);
  }
}
