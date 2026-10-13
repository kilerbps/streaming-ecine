import {
  type CanActivate,
  type ExecutionContext,
  Global,
  type INestApplication,
  Injectable,
  Module,
  RequestMethod,
  type Type,
} from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import type { Request } from 'express';
import request from 'supertest';
import type { AdminUser, Problem, Role } from '@ecine/contracts';
import { AuditService } from '../audit/audit.service.js';
import { RolesGuard } from '../auth/guards.js';
import { SessionService } from '../auth/session.service.js';
import { ReturnsInterceptor } from '../common/contract.decorators.js';
import { ProblemDetailsFilter } from '../common/problem-details.filter.js';
import { PROBLEM_TYPES, ProblemException } from '../common/problem.js';
import { ENV, type Env } from '../config/env.js';
import { MediaUrls } from '../content/content.helpers.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ContentEventsService } from '../revalidate/content-events.service.js';
import { AdminModule } from './admin.module.js';
import { AdminArticlesController } from './articles.controller.js';
import { AdminFilmsController } from './films.controller.js';
import { AdminInsightsController } from './insights.controller.js';
import { AdminContactMessagesController, AdminReportsController } from './moderation.controller.js';
import { AdminPeopleController } from './people.controller.js';
import { AdminPostsController } from './posts.controller.js';
import {
  AdminCategoriesController,
  AdminPagesController,
  AdminRedirectsController,
  AdminSettingsController,
  AdminTeamController,
} from './site.controller.js';
import { AdminUsersController } from './users.controller.js';

/**
 * Tests HTTP du module d'administration, sans base : vrais contrôleurs, pipes, RolesGuard, intercepteur
 * de contrat et filtre RFC 9457 ; Prisma, audit et revalidation sont simulés.
 */

/** Matrice attendue, écrite indépendamment des décorateurs (docs/04-API-SPEC.md §3). */
const MATRIX: Array<[Type, Role]> = [
  [AdminFilmsController, 'EDITOR'],
  [AdminPeopleController, 'EDITOR'],
  [AdminArticlesController, 'EDITOR'],
  [AdminPostsController, 'EDITOR'],
  [AdminCategoriesController, 'EDITOR'],
  [AdminTeamController, 'EDITOR'],
  [AdminPagesController, 'EDITOR'],
  [AdminRedirectsController, 'EDITOR'],
  [AdminContactMessagesController, 'EDITOR'],
  [AdminReportsController, 'MODERATOR'],
  [AdminSettingsController, 'ADMIN'],
  [AdminUsersController, 'ADMIN'],
  [AdminInsightsController, 'ADMIN'],
];
const JUST_BELOW: Partial<Record<Role, Role>> = {
  MODERATOR: 'CREATOR',
  EDITOR: 'MODERATOR',
  ADMIN: 'EDITOR',
};

interface Route {
  method: 'get' | 'post' | 'patch' | 'delete';
  path: string;
}

/** Routes déclarées par un contrôleur (lues dans les métadonnées Nest `path` / `method`). */
function routesOf(controller: Type): Route[] {
  const prefix = Reflect.getMetadata('path', controller) as string;
  const proto = controller.prototype as Record<string, unknown>;
  return Object.getOwnPropertyNames(proto)
    .filter(
      (name) => name !== 'constructor' && Reflect.hasMetadata('method', proto[name] as object),
    )
    .map((name) => {
      const handler = proto[name] as object;
      const method = RequestMethod[
        Reflect.getMetadata('method', handler) as RequestMethod
      ].toLowerCase() as Route['method'];
      const sub = (Reflect.getMetadata('path', handler) as string).replace(/^\//, '');
      return { method, path: `/v1/${prefix}${sub ? `/${sub}` : ''}`.replace(/:id/g, 'id-1') };
    });
}

/** Utilisateur simulé : en-tête `x-test-user: {id}:{role}` (le rôle « en base » est relu par RolesGuard). */
@Injectable()
class FakeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers['x-test-user'];
    if (typeof header !== 'string') throw ProblemException.unauthorized();
    const [id = '', role = 'MEMBER'] = header.split(':');
    req.user = { id, role: role as Role, family: 'famille', mfa: true };
    return true;
  }
}

const roles = new Map<string, Role>();
const prisma = {
  user: {
    // RolesGuard : rôle de l'acteur relu « en base ».
    findUnique: vi.fn(({ where }: { where: { id: string } }) =>
      Promise.resolve(
        roles.has(where.id)
          ? { role: roles.get(where.id), disabledAt: null, deletedAt: null }
          : null,
      ),
    ),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
  },
  film: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  filmTranslation: { count: vi.fn() },
  $queryRaw: vi.fn(),
  $transaction: vi.fn(),
};
const audit = { log: vi.fn() };
const events = { changed: vi.fn() };
const sessions = { revokeAllForUser: vi.fn() };

@Global()
@Module({
  providers: [
    { provide: PrismaService, useValue: prisma },
    { provide: AuditService, useValue: audit },
    { provide: ContentEventsService, useValue: events },
    { provide: SessionService, useValue: sessions },
    {
      provide: ENV,
      useValue: {
        NODE_ENV: 'test',
        ADMIN_MFA_REQUIRED: true,
        MEDIA_PUBLIC_URL: 'https://media.test',
      } as Env,
    },
    MediaUrls,
  ],
  exports: [PrismaService, AuditService, ContentEventsService, SessionService, ENV, MediaUrls],
})
class StubsModule {}

const as = (id: string, role: Role) => {
  roles.set(id, role);
  return { 'x-test-user': `${id}:${role}` };
};

let app: INestApplication;
const http = () => request(app.getHttpServer() as Server);
/** Corps JSON typé (problème RFC 9457 ou ressource). */
const body = <T = Problem>(res: { body: unknown }) => res.body as T;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [StubsModule, AdminModule],
    providers: [
      { provide: APP_GUARD, useClass: FakeAuthGuard },
      { provide: APP_GUARD, useClass: RolesGuard },
      { provide: APP_INTERCEPTOR, useClass: ReturnsInterceptor },
      { provide: APP_FILTER, useClass: ProblemDetailsFilter },
    ],
  }).compile();
  app = moduleRef.createNestApplication({ logger: false });
  app.setGlobalPrefix('v1');
  await app.init();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('matrice des rôles : chaque route d’administration', () => {
  for (const [controller, minimum] of MATRIX) {
    const below = JUST_BELOW[minimum]!;
    for (const route of routesOf(controller)) {
      it(`${route.method.toUpperCase()} ${route.path} : 401 sans compte, 403 pour ${below}`, async () => {
        const anonymous = await http()[route.method](route.path);
        expect(anonymous.status).toBe(401);
        expect(anonymous.headers['cache-control']).toBe('no-store');
        const tooLow = await http()[route.method](route.path).set(as('low', below));
        expect(tooLow.status).toBe(403);
        expect(tooLow.headers['content-type']).toContain('application/problem+json');
      });
    }
  }

  for (const [controller, minimum] of MATRIX) {
    for (const route of routesOf(controller).filter((r) => r.method === 'delete')) {
      it(`DELETE ${route.path} exige confirm=true (400 sinon, rien n’est supprimé)`, async () => {
        const res = await http().delete(route.path).set(as('ok', minimum));
        expect(res.status).toBe(400);
        expect(body(res).detail).toBe('Confirmez la suppression (paramètre confirm=true).');
        expect(audit.log).not.toHaveBeenCalled();
      });
    }
  }

  it('couvre toutes les routes du module (aucune route oubliée dans la matrice)', () => {
    const routes = MATRIX.flatMap(([controller]) => routesOf(controller));
    expect(routes.length).toBeGreaterThanOrEqual(70);
    expect(routes.every((r) => r.path.startsWith('/v1/admin/'))).toBe(true);
  });
});

describe('films', () => {
  it('liste pour un EDITOR, en no-store', async () => {
    prisma.film.findMany.mockResolvedValue([]);
    const res = await http().get('/v1/admin/films').set(as('ed', 'EDITOR'));
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(body(res)).toEqual({ items: [], nextCursor: null });
  });

  it('refuse une liste avec un filtre inconnu (400)', async () => {
    const res = await http().get('/v1/admin/films?sort=title').set(as('ed', 'EDITOR'));
    expect(res.status).toBe(400);
  });

  it('exige confirm=true pour supprimer', async () => {
    const res = await http().delete('/v1/admin/films/f1').set(as('ed', 'EDITOR'));
    expect(res.status).toBe(400);
    expect(prisma.film.update).not.toHaveBeenCalled();
  });

  it('supprime (corbeille), journalise et invalide', async () => {
    prisma.film.findUnique.mockResolvedValue({
      id: 'f1',
      slug: 'mwana',
      state: 'PUBLISHED',
      deletedAt: null,
    });
    prisma.film.update.mockResolvedValue({});
    const res = await http().delete('/v1/admin/films/f1?confirm=true').set(as('ed', 'EDITOR'));
    expect(res.status).toBe(204);
    expect(prisma.film.update).toHaveBeenCalledWith({
      where: { id: 'f1' },
      data: { deletedAt: expect.any(Date) as Date },
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'film.delete', entityId: 'f1' }),
    );
    expect(events.changed).toHaveBeenCalledWith('film', ['mwana']);
  });

  it('refuse la publication en 422 avec la liste de ce qui manque', async () => {
    prisma.film.findUnique.mockResolvedValue({
      id: 'f1',
      slug: 'mwana',
      state: 'DRAFT',
      publishAt: null,
      deletedAt: null,
      rightsOk: false,
      trailerUrl: null,
      ageRating: '13+',
      audioLanguages: ['ln'],
      releaseAt: null,
      translations: [{ title: 'Mwana', synopsis: 'Résumé', seoTitle: null }],
      poster: null,
      _count: { videos: 0 },
    });
    const res = await http().post('/v1/admin/films/f1/publish').set(as('ed', 'EDITOR'));
    expect(res.status).toBe(422);
    expect(body(res).type).toBe(PROBLEM_TYPES.publishBlocked);
    expect((body(res).errors ?? []).map((e) => e.path)).toEqual(['posterId', 'rightsOk', 'videos']);
    expect(prisma.film.update).not.toHaveBeenCalled();
  });
});

describe('utilisateurs et rôles', () => {
  const row = (id: string, role: Role) => ({
    id,
    email: `${id}@ina.cd`,
    displayName: id,
    role,
    emailVerified: null,
    twoFactorEnabledAt: null,
    disabledAt: null,
    createdAt: new Date('2026-09-01T00:00:00Z'),
    passwordHash: 'ne-doit-jamais-sortir',
  });

  it('un ADMIN ne modifie pas son propre rôle', async () => {
    prisma.user.findFirst.mockResolvedValue(row('adm', 'ADMIN'));
    const res = await http()
      .patch('/v1/admin/users/adm/role')
      .set(as('adm', 'ADMIN'))
      .send({ role: 'MEMBER' });
    expect(res.status).toBe(403);
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it('un ADMIN ne rétrograde pas un autre ADMIN', async () => {
    prisma.user.findFirst.mockResolvedValue(row('other', 'ADMIN'));
    const res = await http()
      .patch('/v1/admin/users/other/role')
      .set(as('adm', 'ADMIN'))
      .send({ role: 'MEMBER' });
    expect(res.status).toBe(403);
  });

  it('un ADMIN promeut un membre EDITOR (sans fuite de champ sensible)', async () => {
    prisma.user.findFirst
      .mockResolvedValueOnce(row('m1', 'MEMBER'))
      .mockResolvedValueOnce(row('m1', 'EDITOR'));
    prisma.user.updateMany.mockResolvedValue({ count: 1 });
    const res = await http()
      .patch('/v1/admin/users/m1/role')
      .set(as('adm', 'ADMIN'))
      .send({ role: 'EDITOR' });
    expect(res.status).toBe(200);
    expect(body<AdminUser>(res).role).toBe('EDITOR');
    expect(body<AdminUser>(res)).not.toHaveProperty('passwordHash');
    expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'user.role', entityId: 'm1' }),
    );
  });

  it('la désactivation révoque toutes les sessions', async () => {
    prisma.user.findFirst
      .mockResolvedValueOnce(row('m1', 'MEMBER'))
      .mockResolvedValueOnce({ ...row('m1', 'MEMBER'), disabledAt: new Date() });
    prisma.user.update.mockResolvedValue({});
    const res = await http()
      .patch('/v1/admin/users/m1/status')
      .set(as('adm', 'ADMIN'))
      .send({ disabled: true });
    expect(res.status).toBe(200);
    expect(sessions.revokeAllForUser).toHaveBeenCalledWith('m1');
  });

  it('refuse un rôle inconnu (400)', async () => {
    const res = await http()
      .patch('/v1/admin/users/m1/role')
      .set(as('adm', 'ADMIN'))
      .send({ role: 'ROOT' });
    expect(res.status).toBe(400);
  });
});

describe('statistiques', () => {
  it('exporte un CSV quotidien', async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    const res = await http().get('/v1/admin/stats/export.csv?days=7').set(as('adm', 'ADMIN'));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['cache-control']).toBe('no-store');
    const lines = res.text.trim().split('\r\n');
    expect(lines[0]).toBe('date,visites,lectures_lancees,lectures_terminees');
    expect(lines).toHaveLength(8);
  });

  it('refuse une période hors 7/30/90 jours', async () => {
    const res = await http().get('/v1/admin/stats/overview?days=12').set(as('adm', 'ADMIN'));
    expect(res.status).toBe(400);
  });
});
