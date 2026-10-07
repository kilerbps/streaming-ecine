import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { DEFAULT_LOCALE, type AdminCategory, type categoryInputSchema } from '@ecine/contracts';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import { ProblemException } from '../common/problem.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ContentEventsService } from '../revalidate/content-events.service.js';
import { auditDiff, publicPath, redirectSlugChange } from './admin.helpers.js';

const FR = DEFAULT_LOCALE;
type CategoryInput = z.infer<typeof categoryInputSchema>;

const adminCategoryInclude = {
  translations: { where: { locale: FR } },
  // Toutes les associations, corbeille comprise : c'est ce qui bloque une suppression.
  _count: { select: { films: true } },
} satisfies Prisma.CategoryInclude;
type AdminCategoryRow = Prisma.CategoryGetPayload<{ include: typeof adminCategoryInclude }>;

function toAdmin(category: AdminCategoryRow): AdminCategory {
  return {
    id: category.id,
    slug: category.slug,
    name: category.translations[0]?.name ?? category.slug,
    filmCount: category._count.films,
  };
}

/** Catégories du catalogue (référentiel). Suppression définitive seulement si aucun film n'y est rattaché. */
@Injectable()
export class AdminCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: ContentEventsService,
  ) {}

  async list(): Promise<AdminCategory[]> {
    const categories = await this.prisma.category.findMany({
      include: adminCategoryInclude,
      orderBy: { slug: 'asc' },
    });
    return categories.map(toAdmin);
  }

  async create(req: Request, input: CategoryInput): Promise<AdminCategory> {
    await this.assertSlugFree(this.prisma, input.slug);
    const category = await this.prisma.category.create({
      data: { slug: input.slug, translations: { create: { locale: FR, name: input.name } } },
      include: adminCategoryInclude,
    });
    await this.audit.log(req, {
      action: 'category.create',
      entity: 'Category',
      entityId: category.id,
      meta: { slug: input.slug, name: input.name },
    });
    await this.events.changed('category');
    return toAdmin(category);
  }

  async update(req: Request, id: string, input: CategoryInput): Promise<AdminCategory> {
    const before = toAdmin(await this.load(id));
    const slugChanged = input.slug !== before.slug;
    const category = await this.prisma.$transaction(async (tx) => {
      if (slugChanged) await this.assertSlugFree(tx, input.slug);
      const updated = await tx.category.update({
        where: { id },
        data: {
          slug: input.slug,
          translations: {
            upsert: {
              where: { categoryId_locale: { categoryId: id, locale: FR } },
              create: { locale: FR, name: input.name },
              update: { name: input.name },
            },
          },
        },
        include: adminCategoryInclude,
      });
      if (slugChanged)
        await redirectSlugChange(
          tx,
          publicPath.category(before.slug),
          publicPath.category(input.slug),
        );
      return updated;
    });
    const after = toAdmin(category);
    await this.audit.log(req, {
      action: 'category.update',
      entity: 'Category',
      entityId: id,
      meta: auditDiff(
        { slug: before.slug, name: before.name },
        { slug: after.slug, name: after.name },
      ),
    });
    await this.events.changed('category');
    return after;
  }

  async remove(req: Request, id: string): Promise<void> {
    const category = toAdmin(await this.load(id));
    if (category.filmCount > 0) {
      throw ProblemException.conflict(
        `Cette catégorie est encore attribuée à ${category.filmCount} film(s), corbeille comprise. Retirez-la de ces films avant de la supprimer.`,
      );
    }
    // Suppression conditionnelle : si un film a été rattaché entre-temps, rien n'est supprimé.
    const { count } = await this.prisma.category.deleteMany({ where: { id, films: { none: {} } } });
    if (count === 0)
      throw ProblemException.conflict(
        'Cette catégorie vient d’être attribuée à un film : suppression annulée.',
      );
    await this.audit.log(req, {
      action: 'category.delete',
      entity: 'Category',
      entityId: id,
      meta: { slug: category.slug, name: category.name },
    });
    await this.events.changed('category');
  }

  private async load(id: string): Promise<AdminCategoryRow> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: adminCategoryInclude,
    });
    if (!category) throw ProblemException.notFound('Cette catégorie est introuvable.');
    return category;
  }

  private async assertSlugFree(db: Prisma.TransactionClient, slug: string): Promise<void> {
    const taken = await db.category.findUnique({ where: { slug }, select: { id: true } });
    if (taken) throw ProblemException.conflict('Ce slug est déjà utilisé par une autre catégorie.');
  }
}
