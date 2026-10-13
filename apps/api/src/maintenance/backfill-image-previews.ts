import 'reflect-metadata';
import 'dotenv/config';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import { IMAGE_WIDTHS } from '@ecine/contracts';
import { loadEnv } from '../config/env.js';
import { computePreview } from '../media/image-processing.js';
import { storageFile } from '../media/storage.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Rattrapage (refonte, ADR-0012) : couleur dominante et aperçu flou des images envoyées avant leur
 * calcul à l'envoi. Lit la plus petite variante WebP déjà produite ; n'écrit que les champs vides.
 * Sans risque à relancer, y compris en production.
 *
 *   node dist/maintenance/backfill-image-previews.js
 */
const logger = new Logger('BackfillImagePreviews');
const BATCH = 50;

async function main(): Promise<void> {
  const env = loadEnv();
  const prisma = new PrismaService(env);
  let done = 0;
  let missing = 0;
  try {
    for (;;) {
      const batch = await prisma.media.findMany({
        where: { kind: 'IMAGE', OR: [{ dominantColor: null }, { blurDataUrl: null }] },
        select: { id: true, storageKey: true },
        orderBy: { id: 'asc' },
        skip: missing,
        take: BATCH,
      });
      if (batch.length === 0) break;
      for (const media of batch) {
        const dir = storageFile(env, media.storageKey);
        const file = IMAGE_WIDTHS.map((w) => join(dir, `w${w}.webp`)).find((f) => existsSync(f));
        if (!file) {
          // Fichier absent (stockage nettoyé) : on le signale et on passe, sans bloquer les autres.
          missing += 1;
          logger.warn(`Variantes introuvables pour ${media.id}`);
          continue;
        }
        const preview = await computePreview(file);
        await prisma.media.update({
          where: { id: media.id },
          data: { dominantColor: preview.dominantColor, blurDataUrl: preview.blurDataUrl },
        });
        done += 1;
      }
    }
    logger.log(`${done} image(s) enrichie(s), ${missing} sans fichier.`);
  } finally {
    await prisma.$disconnect();
  }
}

try {
  await main();
} catch (err) {
  logger.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
}
