import 'reflect-metadata';
import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { PasswordService } from '../auth/password.service.js';
import { ProblemException } from '../common/problem.js';
import { loadEnv } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Premier compte SUPER_ADMIN d'une nouvelle installation, production comprise (le seed de
 * démonstration y est interdit). Ne sert qu'une fois : refuse s'il existe déjà un SUPER_ADMIN.
 * Le mot de passe arrive par l'environnement, jamais en argument (visible dans la liste des
 * processus) ; infra/secrets.sh le génère et le range dans /etc/ecine/secrets.
 *
 *   ADMIN_EMAIL=… ADMIN_PASSWORD=… node dist/maintenance/create-admin.js
 */
const logger = new Logger('CreateAdmin');

const inputSchema = z.object({
  ADMIN_EMAIL: z.email('ADMIN_EMAIL : adresse e-mail valide requise'),
  ADMIN_PASSWORD: z.string().min(12, 'ADMIN_PASSWORD : 12 caractères au moins'),
});

async function main(): Promise<void> {
  const input = inputSchema.safeParse(process.env);
  if (!input.success) {
    throw new Error(input.error.issues.map((i) => i.message).join(' ; '));
  }
  const email = input.data.ADMIN_EMAIL.trim().toLowerCase();
  const password = input.data.ADMIN_PASSWORD;
  const passwords = new PasswordService();
  const prisma = new PrismaService(loadEnv());
  try {
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true },
    });
    if (existingAdmin) {
      logger.log('Un compte SUPER_ADMIN existe déjà : rien à faire.');
      return;
    }
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data: { role: 'SUPER_ADMIN' } });
      logger.log('Compte existant promu SUPER_ADMIN (mot de passe inchangé).');
      return;
    }
    passwords.assertAcceptable(password, email);
    await prisma.user.create({
      data: {
        email,
        passwordHash: await passwords.hash(password),
        displayName: 'Administrateur E-Ciné',
        role: 'SUPER_ADMIN',
        emailVerified: new Date(),
      },
    });
    logger.log(
      'Compte SUPER_ADMIN créé. Activez la double authentification à la première connexion.',
    );
  } finally {
    await prisma.$disconnect();
  }
}

try {
  await main();
} catch (err) {
  const message =
    err instanceof ProblemException ? (err.problem.detail ?? err.message) : (err as Error).message;
  logger.error(`Échec : ${message}`);
  process.exitCode = 1;
}
