import { mkdir, readdir, rename, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ENV, type Env } from '../config/env.js';
import { storagePaths } from '../media/static.js';
import { storageFile } from '../media/storage.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ContentEventsService } from '../revalidate/content-events.service.js';
import { probe, runProcess } from './ffmpeg-runner.js';
import { buildPreviewArgs, previewFileName, previewStart } from './preview.js';

/** Filigrane généré par `pnpm brand:build` (apps/api/assets, copié dans l'image du worker). */
const WATERMARK_FILE = fileURLToPath(new URL('../../assets/watermark.png', import.meta.url));
/** FFmpeg arrêté s'il ne signale plus rien pendant 2 min (extrait de 14 s). */
const IDLE_TIMEOUT_MS = 2 * 60_000;

const exists = (path: string) =>
  stat(path).then(
    () => true,
    () => false,
  );

/**
 * Aperçus promotionnels (ADR-0015) : extrait statique au passage choisi en administration, taillé
 * dans la source de la vidéo prête la plus récente. Sans début choisi ou sans vidéo, l'aperçu est
 * retiré. Les fichiers portent un nom versionné, servis sous /media/previews/ et mis en cache un an.
 */
@Injectable()
export class PreviewGenerator {
  private readonly logger = new Logger(PreviewGenerator.name);
  private readonly dir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: ContentEventsService,
    @Inject(ENV) private readonly env: Env,
  ) {
    this.dir = storagePaths(env).previews;
  }

  private load(filmId: string) {
    return this.prisma.film.findUnique({
      where: { id: filmId },
      select: {
        id: true,
        slug: true,
        previewStartSec: true,
        previewFile: true,
        videos: {
          where: { state: 'READY' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, durationSec: true, sourceMedia: { select: { storageKey: true } } },
        },
      },
    });
  }

  async generate(filmId: string): Promise<void> {
    // Début ou vidéo changés pendant la génération : une passe de plus (au plus deux).
    for (let pass = 0; pass < 2; pass += 1) {
      if (!(await this.once(filmId))) return;
    }
  }

  /** Une passe ; renvoie vrai si le film a changé entre-temps. */
  private async once(filmId: string): Promise<boolean> {
    const film = await this.load(filmId);
    if (!film) return false;
    const video = film.videos[0];
    if (film.previewStartSec === null || !video?.sourceMedia) {
      if (film.previewFile) {
        await this.prisma.film.update({ where: { id: film.id }, data: { previewFile: null } });
        await this.removeOthers(film.id, null);
        await this.events.changed('film', [film.slug]);
        this.logger.log({ filmId }, 'Aperçu retiré');
      }
      return false;
    }

    const start = previewStart(film.previewStartSec, video.durationSec);
    const name = previewFileName(film.id, video.id, start);
    const target = join(this.dir, name);
    if (film.previewFile !== name || !(await exists(target))) {
      await mkdir(this.dir, { recursive: true });
      const input = storageFile(this.env, video.sourceMedia.storageKey);
      const info = await probe(this.env.FFPROBE_PATH, input);
      const part = join(this.dir, `${name}.part.mp4`);
      const result = await runProcess(
        this.env.FFMPEG_PATH,
        buildPreviewArgs({
          input,
          watermark: WATERMARK_FILE,
          output: part,
          startSec: start,
          sourceWidth: info.width,
          sourceHeight: info.height,
        }),
        { idleTimeoutMs: IDLE_TIMEOUT_MS },
      );
      if (result.code !== 0) {
        await rm(part, { force: true });
        throw new Error(`FFmpeg (aperçu) : ${result.stderrTail.slice(-300)}`);
      }
      await rename(part, target);
      await this.prisma.film.update({ where: { id: film.id }, data: { previewFile: name } });
      await this.removeOthers(film.id, name);
      await this.events.changed('film', [film.slug]);
      const { size } = await stat(target);
      this.logger.log({ filmId, startSec: start, bytes: size }, 'Aperçu prêt');
    }

    const current = await this.load(filmId);
    return current?.previewStartSec !== film.previewStartSec || current?.videos[0]?.id !== video.id;
  }

  /** Supprime les anciens aperçus du film (autre version, ou tous si `keep` est null). */
  private async removeOthers(filmId: string, keep: string | null): Promise<void> {
    const files = await readdir(this.dir).catch(() => [] as string[]);
    await Promise.all(
      files
        .filter((file) => file.startsWith(`${filmId}-`) && file !== keep)
        .map((file) => rm(join(this.dir, file), { force: true })),
    );
  }
}
