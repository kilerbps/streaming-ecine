import { open, rename, rm, stat, statfs, truncate, writeFile } from 'node:fs/promises';
import { Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import {
  hasRole,
  type VideoStatus,
  type VideoUpload,
  type videoUploadInitSchema,
} from '@ecine/contracts';
import type { z } from 'zod';
import type { AuthUser } from '../auth/auth.types.js';
import { AuditService } from '../audit/audit.service.js';
import { ENV, type Env } from '../config/env.js';
import { ProblemException } from '../common/problem.js';
import type { Upload } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { insufficientStorage, offsetMismatch, unsupportedMedia } from './media.problems.js';
import { storagePaths } from './static.js';
import { newId, storageFile, VIDEO_EXTENSIONS } from './storage.js';
import { matchesVideoSignature, registerVideoSource } from './video-source.js';
import { VideosService, videoStatus } from './videos.service.js';

/** Taille des morceaux envoyés par le client : sous la limite de 4,5 Mo des Server Actions Vercel. */
export const UPLOAD_CHUNK_SIZE = 3 * 1024 * 1024;
/** Marge disque gardée libre (sources + HLS + système). */
const DISK_MARGIN_BYTES = 2 * 1024 ** 3;
const OFFSET_RE = /^\d{1,15}$/;

type VideoUploadInit = z.infer<typeof videoUploadInitSchema>;

/**
 * Envoi vidéo reprenable par morceaux (principe tus) : chaque morceau est écrit à sa position,
 * la position attendue est `receivedBytes` ; la signature du fichier est vérifiée au premier morceau.
 * La source n'est jamais placée dans un dossier public.
 */
@Injectable()
export class UploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly videos: VideosService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async init(input: VideoUploadInit, user: AuthUser, req: Request): Promise<VideoUpload> {
    const film = await this.prisma.film.findFirst({
      where: { id: input.filmId, deletedAt: null },
      select: { id: true },
    });
    if (!film) throw ProblemException.notFound('Film introuvable.');
    await this.ensureDiskSpace(input.bytes);

    const id = newId();
    const storageKey = `uploads/${id}.part`;
    const partPath = storageFile(this.env, storageKey);
    await writeFile(partPath, Buffer.alloc(0), { flag: 'wx', mode: 0o600 });
    try {
      await this.prisma.upload.create({
        data: {
          id,
          filmId: film.id,
          createdById: user.id,
          fileName: input.fileName,
          mime: input.mime,
          bytes: BigInt(input.bytes),
          storageKey,
        },
      });
    } catch (err) {
      await rm(partPath, { force: true });
      throw err;
    }
    await this.audit.log(req, {
      action: 'video.upload_init',
      entity: 'Upload',
      entityId: id,
      meta: { filmId: film.id, bytes: input.bytes, mime: input.mime },
    });
    return { uploadId: id, chunkSize: UPLOAD_CHUNK_SIZE, receivedBytes: 0, bytes: input.bytes };
  }

  async get(id: string, user: AuthUser): Promise<VideoUpload> {
    return this.view(await this.owned(id, user));
  }

  async chunk(
    id: string,
    offsetHeader: string | undefined,
    body: unknown,
    user: AuthUser,
  ): Promise<VideoUpload> {
    if (!offsetHeader || !OFFSET_RE.test(offsetHeader)) {
      throw ProblemException.badRequest('En-tête upload-offset manquant ou invalide.', [
        { path: 'upload-offset', message: 'Position en octets (entier positif) attendue.' },
      ]);
    }
    if (!Buffer.isBuffer(body) || body.length === 0) {
      throw unsupportedMedia('Envoyez le morceau en application/octet-stream (4 Mio au plus).');
    }
    const offset = Number(offsetHeader);
    const upload = await this.owned(id, user);
    if (upload.completedAt) throw ProblemException.conflict('Cet envoi est déjà terminé.');
    const received = Number(upload.receivedBytes);
    const total = Number(upload.bytes);
    if (offset !== received) throw offsetMismatch(received);
    if (offset + body.length > total) {
      throw ProblemException.badRequest('Le morceau dépasse la taille annoncée du fichier.');
    }
    if (offset === 0 && !matchesVideoSignature(body, upload.mime)) {
      await this.discard(upload);
      throw unsupportedMedia(
        'Ce fichier n’est pas une vidéo MP4, MOV, MKV ou WebM valide (signature non reconnue). Envoi annulé.',
      );
    }

    // Écriture positionnelle : rejouer un morceau (réseau coupé avant la réponse) est sans effet de bord.
    const handle = await open(storageFile(this.env, upload.storageKey), 'r+').catch(() => {
      throw ProblemException.conflict('Fichier d’envoi introuvable : recommencez l’envoi.');
    });
    try {
      await handle.write(body, 0, body.length, offset);
    } finally {
      await handle.close();
    }
    const next = offset + body.length;
    const updated = await this.prisma.upload.updateMany({
      where: { id, receivedBytes: BigInt(offset), completedAt: null },
      data: { receivedBytes: BigInt(next) },
    });
    if (updated.count === 0) {
      const current = await this.prisma.upload.findUnique({
        where: { id },
        select: { receivedBytes: true },
      });
      throw offsetMismatch(Number(current?.receivedBytes ?? 0));
    }
    return { uploadId: id, chunkSize: UPLOAD_CHUNK_SIZE, receivedBytes: next, bytes: total };
  }

  /** Fin de l'envoi : source déplacée hors des envois, vidéo PENDING créée, transcodage mis en file. */
  async complete(id: string, user: AuthUser, req: Request): Promise<VideoStatus> {
    const upload = await this.owned(id, user);
    if (upload.completedAt) throw ProblemException.conflict('Cet envoi est déjà terminé.');
    const total = Number(upload.bytes);
    if (Number(upload.receivedBytes) !== total) {
      throw ProblemException.conflict(
        `Envoi incomplet : ${Number(upload.receivedBytes)} octets reçus sur ${total}.`,
      );
    }
    const film = await this.prisma.film.findFirst({
      where: { id: upload.filmId, deletedAt: null },
      select: { id: true },
    });
    if (!film) throw ProblemException.notFound('Film introuvable.');

    const partPath = storageFile(this.env, upload.storageKey);
    const size = await stat(partPath)
      .then((s) => s.size)
      .catch(() => -1);
    if (size < total)
      throw ProblemException.conflict(
        'Fichier d’envoi incomplet ou introuvable : recommencez l’envoi.',
      );
    if (size > total) await truncate(partPath, total);

    // Verrou : une seule finalisation possible, même en cas de double clic.
    const claimed = await this.prisma.upload.updateMany({
      where: { id, completedAt: null },
      data: { completedAt: new Date() },
    });
    if (claimed.count === 0) throw ProblemException.conflict('Cet envoi est déjà terminé.');

    const mediaId = newId();
    const sourceKey = `sources/${mediaId}${VIDEO_EXTENSIONS[upload.mime] ?? '.bin'}`;
    const sourcePath = storageFile(this.env, sourceKey);
    await rename(partPath, sourcePath);
    let video;
    try {
      video = await registerVideoSource(this.prisma, {
        filmId: film.id,
        mediaId,
        storageKey: sourceKey,
        mime: upload.mime,
        bytes: total,
      });
    } catch (err) {
      await rename(sourcePath, partPath).catch(() => undefined);
      await this.prisma.upload
        .update({ where: { id }, data: { completedAt: null } })
        .catch(() => undefined);
      throw err;
    }

    const queued = await this.videos.enqueue(video.id);
    await this.audit.log(req, {
      action: 'video.upload_complete',
      entity: 'VideoAsset',
      entityId: video.id,
      meta: { filmId: film.id, uploadId: id, bytes: total, mime: upload.mime, queued },
    });
    return queued ? videoStatus(video) : this.videos.status(video.id);
  }

  /** Seul l'auteur de l'envoi (ou un ADMIN) y a accès ; sinon 404 (aucune fuite d'existence). */
  private async owned(id: string, user: AuthUser): Promise<Upload> {
    const upload = await this.prisma.upload.findUnique({ where: { id } });
    if (!upload || (upload.createdById !== user.id && !hasRole(user.role, 'ADMIN'))) {
      throw ProblemException.notFound('Envoi introuvable.');
    }
    return upload;
  }

  private view(upload: Upload): VideoUpload {
    return {
      uploadId: upload.id,
      chunkSize: UPLOAD_CHUNK_SIZE,
      receivedBytes: Number(upload.receivedBytes),
      bytes: Number(upload.bytes),
    };
  }

  private async discard(upload: Upload): Promise<void> {
    await this.prisma.upload.delete({ where: { id: upload.id } }).catch(() => undefined);
    await rm(storageFile(this.env, upload.storageKey), { force: true });
  }

  private async ensureDiskSpace(bytes: number): Promise<void> {
    try {
      const fs = await statfs(storagePaths(this.env).uploads);
      if (fs.bavail * fs.bsize < bytes + DISK_MARGIN_BYTES) throw insufficientStorage();
    } catch (err) {
      if (err instanceof ProblemException) throw err;
      // statfs indisponible : on n'empêche pas l'envoi (la vérification est un confort).
    }
  }
}
