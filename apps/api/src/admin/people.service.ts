import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import {
  DEFAULT_LOCALE,
  socialsSchema,
  type AdminListQuery,
  type AdminPerson,
  type AdminRow,
  type Page,
  type PersonInput,
  type PublishCheck,
  type PublishState,
} from '@ecine/contracts';
import { AuditService } from '../audit/audit.service.js';
import { ProblemException } from '../common/problem.js';
import { iso, MediaUrls } from '../content/content.helpers.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ContentEventsService } from '../revalidate/content-events.service.js';
import {
  assertImages,
  assertNotDeleted,
  auditDiff,
  type AuditSnapshot,
  containsInsensitive,
  decodeAdminCursor,
  pageOf,
  publicPath,
  redirectSlugChange,
  updatedBefore,
} from './admin.helpers.js';
import {
  assertPublishable,
  imageFacts,
  personPublishIssues,
  toPublishCheck,
} from './publish-checks.js';

const FR = DEFAULT_LOCALE;

const adminPersonInclude = {
  translations: { where: { locale: FR } },
  photo: true,
} satisfies Prisma.PersonInclude;
type AdminPersonRow = Prisma.PersonGetPayload<{ include: typeof adminPersonInclude }>;

function snapshot(person: AdminPerson): AuditSnapshot {
  return {
    slug: person.slug,
    state: person.state,
    name: person.name,
    bio: person.bio,
    birthYear: person.birthYear,
    photoId: person.photo?.id ?? null,
    socials: Object.entries(person.socials).map(([network, url]) => `${network}:${url}`),
  };
}

/** Acteurs et équipes techniques (FR-102). La filmographie se gère depuis les crédits des films. */
@Injectable()
export class AdminPeopleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaUrls,
    private readonly audit: AuditService,
    private readonly events: ContentEventsService,
  ) {}

  async list(q: AdminListQuery): Promise<Page<AdminRow>> {
    const rows = await this.prisma.person.findMany({
      where: {
        ...(q.includeDeleted === 'true' ? {} : { deletedAt: null }),
        ...(q.state ? { state: q.state } : {}),
        ...(q.q ? { translations: { some: { locale: FR, name: containsInsensitive(q.q) } } } : {}),
        ...updatedBefore(decodeAdminCursor(q.cursor)),
      },
      select: {
        id: true,
        slug: true,
        state: true,
        updatedAt: true,
        deletedAt: true,
        translations: { where: { locale: FR }, select: { name: true } },
        _count: { select: { credits: true } },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: q.limit + 1,
    });
    return pageOf(
      rows,
      q.limit,
      (p) => p.updatedAt,
      (p) => ({
        id: p.id,
        slug: p.slug,
        title: p.translations[0]?.name ?? p.slug,
        state: p.state,
        updatedAt: p.updatedAt.toISOString(),
        deletedAt: iso(p.deletedAt),
        meta: p._count.credits === 1 ? '1 crédit' : `${p._count.credits} crédits`,
      }),
    );
  }

  async get(id: string): Promise<AdminPerson> {
    const person = await this.prisma.person.findUnique({
      where: { id },
      include: adminPersonInclude,
    });
    if (!person) throw ProblemException.notFound('Cette personne est introuvable.');
    return this.toAdmin(person);
  }

  async create(req: Request, input: PersonInput): Promise<AdminPerson> {
    const id = await this.prisma.$transaction(async (tx) => {
      await this.assertSlugFree(tx, input.slug);
      await assertImages(tx, input.photoId ? [{ id: input.photoId, path: 'photoId' }] : [], false);
      const person = await tx.person.create({
        data: {
          slug: input.slug,
          state: 'DRAFT',
          birthYear: input.birthYear ?? null,
          photoId: input.photoId ?? null,
          socials: input.socials,
          translations: { create: { locale: FR, name: input.name, bio: input.bio } },
        },
        select: { id: true },
      });
      return person.id;
    });
    const created = await this.get(id);
    await this.audit.log(req, {
      action: 'person.create',
      entity: 'Person',
      entityId: id,
      meta: auditDiff({}, snapshot(created)),
    });
    await this.events.changed('person', [created.slug]);
    return created;
  }

  async update(req: Request, id: string, input: PersonInput): Promise<AdminPerson> {
    const before = await this.get(id);
    assertNotDeleted(
      { deletedAt: before.deletedAt ? new Date(before.deletedAt) : null },
      'Restaurez cette personne avant de la modifier.',
    );
    const slugChanged = input.slug !== before.slug;
    await this.prisma.$transaction(async (tx) => {
      if (slugChanged) await this.assertSlugFree(tx, input.slug);
      await assertImages(tx, input.photoId ? [{ id: input.photoId, path: 'photoId' }] : [], false);
      const translation = { name: input.name, bio: input.bio };
      await tx.person.update({
        where: { id },
        data: {
          slug: input.slug,
          birthYear: input.birthYear ?? null,
          photoId: input.photoId ?? null,
          socials: input.socials,
          translations: {
            upsert: {
              where: { personId_locale: { personId: id, locale: FR } },
              create: { locale: FR, ...translation },
              update: translation,
            },
          },
        },
      });
      if (slugChanged)
        await redirectSlugChange(tx, publicPath.person(before.slug), publicPath.person(input.slug));
    });
    const after = await this.get(id);
    await this.audit.log(req, {
      action: 'person.update',
      entity: 'Person',
      entityId: id,
      meta: auditDiff(snapshot(before), snapshot(after)),
    });
    await this.events.changed('person', [before.slug, after.slug]);
    return after;
  }

  async remove(req: Request, id: string): Promise<void> {
    const person = await this.find(id);
    if (person.deletedAt) return;
    await this.prisma.person.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log(req, {
      action: 'person.delete',
      entity: 'Person',
      entityId: id,
      meta: { slug: person.slug, state: person.state },
    });
    await this.events.changed('person', [person.slug]);
  }

  async restore(req: Request, id: string): Promise<AdminPerson> {
    const person = await this.find(id);
    if (!person.deletedAt) return this.get(id);
    await this.prisma.person.update({ where: { id }, data: { deletedAt: null, state: 'DRAFT' } });
    await this.audit.log(req, {
      action: 'person.restore',
      entity: 'Person',
      entityId: id,
      meta: { slug: person.slug, before: person.state, after: 'DRAFT' },
    });
    await this.events.changed('person', [person.slug]);
    return this.get(id);
  }

  async check(id: string): Promise<PublishCheck> {
    return toPublishCheck(await this.issues(id));
  }

  async publish(req: Request, id: string): Promise<AdminPerson> {
    const person = await this.find(id);
    assertNotDeleted(person, 'Restaurez cette personne avant de la publier.');
    assertPublishable(await this.issues(id));
    return this.applyState(req, person, 'publish', 'PUBLISHED');
  }

  async unpublish(req: Request, id: string): Promise<AdminPerson> {
    const person = await this.find(id);
    assertNotDeleted(person, 'Restaurez cette personne avant de la modifier.');
    return this.applyState(req, person, 'unpublish', 'DRAFT');
  }

  private async applyState(
    req: Request,
    person: { id: string; slug: string; state: PublishState },
    action: string,
    state: PublishState,
  ): Promise<AdminPerson> {
    await this.prisma.person.update({ where: { id: person.id }, data: { state } });
    await this.audit.log(req, {
      action: `person.${action}`,
      entity: 'Person',
      entityId: person.id,
      meta: { before: { state: person.state }, after: { state } },
    });
    await this.events.changed('person', [person.slug]);
    return this.get(person.id);
  }

  private async find(
    id: string,
  ): Promise<{ id: string; slug: string; state: PublishState; deletedAt: Date | null }> {
    const person = await this.prisma.person.findUnique({
      where: { id },
      select: { id: true, slug: true, state: true, deletedAt: true },
    });
    if (!person) throw ProblemException.notFound('Cette personne est introuvable.');
    return person;
  }

  private async issues(id: string) {
    const person = await this.prisma.person.findUnique({
      where: { id },
      select: {
        translations: { where: { locale: FR }, select: { name: true } },
        photo: { select: { kind: true, alt: true, decorative: true } },
      },
    });
    if (!person) throw ProblemException.notFound('Cette personne est introuvable.');
    return personPublishIssues({
      name: person.translations[0]?.name,
      photo: imageFacts(person.photo),
    });
  }

  private async assertSlugFree(tx: Prisma.TransactionClient, slug: string): Promise<void> {
    const taken = await tx.person.findUnique({ where: { slug }, select: { id: true } });
    if (taken) throw ProblemException.conflict('Ce slug est déjà utilisé par une autre personne.');
  }

  private toAdmin(person: AdminPersonRow): AdminPerson {
    const t = person.translations[0];
    const socials = socialsSchema.safeParse(person.socials ?? {});
    return {
      id: person.id,
      slug: person.slug,
      state: person.state,
      name: t?.name ?? '',
      bio: t?.bio ?? '',
      birthYear: person.birthYear,
      photo: this.media.imageWithId(person.photo),
      socials: socials.success ? socials.data : {},
      updatedAt: person.updatedAt.toISOString(),
      deletedAt: iso(person.deletedAt),
    };
  }
}
