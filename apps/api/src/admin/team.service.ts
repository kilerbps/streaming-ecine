import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { AdminTeamMember, teamMemberInputSchema } from '@ecine/contracts';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import { ProblemException } from '../common/problem.js';
import { MediaUrls } from '../content/content.helpers.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ContentEventsService } from '../revalidate/content-events.service.js';
import { assertImages, auditDiff, type AuditSnapshot } from './admin.helpers.js';

type TeamMemberInput = z.infer<typeof teamMemberInputSchema>;

const teamInclude = { photo: true } satisfies Prisma.TeamMemberInclude;
type TeamMemberRow = Prisma.TeamMemberGetPayload<{ include: typeof teamInclude }>;

function snapshot(member: AdminTeamMember): AuditSnapshot {
  return {
    name: member.name,
    title: member.title,
    bio: member.bio,
    photoId: member.photo?.id ?? null,
    position: member.position,
    visible: member.visible,
  };
}

/** Équipe dirigeante (FR-051) : visible immédiatement, donc photo avec texte alternatif dès l'enregistrement. */
@Injectable()
export class AdminTeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaUrls,
    private readonly audit: AuditService,
    private readonly events: ContentEventsService,
  ) {}

  async list(): Promise<AdminTeamMember[]> {
    const members = await this.prisma.teamMember.findMany({
      include: teamInclude,
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    });
    return members.map((m) => this.toAdmin(m));
  }

  async create(req: Request, input: TeamMemberInput): Promise<AdminTeamMember> {
    await this.assertPhoto(input);
    const member = this.toAdmin(
      await this.prisma.teamMember.create({ data: this.data(input), include: teamInclude }),
    );
    await this.audit.log(req, {
      action: 'team.create',
      entity: 'TeamMember',
      entityId: member.id,
      meta: auditDiff({}, snapshot(member)),
    });
    await this.events.changed('team');
    return member;
  }

  async update(req: Request, id: string, input: TeamMemberInput): Promise<AdminTeamMember> {
    const before = this.toAdmin(await this.load(id));
    await this.assertPhoto(input);
    const after = this.toAdmin(
      await this.prisma.teamMember.update({
        where: { id },
        data: this.data(input),
        include: teamInclude,
      }),
    );
    await this.audit.log(req, {
      action: 'team.update',
      entity: 'TeamMember',
      entityId: id,
      meta: auditDiff(snapshot(before), snapshot(after)),
    });
    await this.events.changed('team');
    return after;
  }

  /** Pas de corbeille pour l'équipe (aucune URL publique propre) : suppression définitive confirmée. */
  async remove(req: Request, id: string): Promise<void> {
    const member = this.toAdmin(await this.load(id));
    await this.prisma.teamMember.delete({ where: { id } });
    await this.audit.log(req, {
      action: 'team.delete',
      entity: 'TeamMember',
      entityId: id,
      meta: { before: snapshot(member) },
    });
    await this.events.changed('team');
  }

  private data(input: TeamMemberInput) {
    return {
      name: input.name,
      title: input.title,
      bio: input.bio || null,
      photoId: input.photoId ?? null,
      position: input.position,
      visible: input.visible,
    };
  }

  private assertPhoto(input: TeamMemberInput): Promise<void> {
    return assertImages(
      this.prisma,
      input.photoId ? [{ id: input.photoId, path: 'photoId' }] : [],
      input.visible,
    );
  }

  private async load(id: string): Promise<TeamMemberRow> {
    const member = await this.prisma.teamMember.findUnique({ where: { id }, include: teamInclude });
    if (!member) throw ProblemException.notFound('Ce membre de l’équipe est introuvable.');
    return member;
  }

  private toAdmin(member: TeamMemberRow): AdminTeamMember {
    return {
      id: member.id,
      name: member.name,
      title: member.title,
      bio: member.bio,
      photo: this.media.imageWithId(member.photo),
      position: member.position,
      visible: member.visible,
    };
  }
}
