// Prisma 7 : l'URL de connexion vit ici (plus dans schema.prisma) et .env n'est pas chargé automatiquement.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node --enable-source-maps dist/seed/seed.js',
  },
  datasource: {
    // Valeur factice acceptée pour `prisma generate` (aucune connexion) ; obligatoire pour migrer.
    url: process.env.DATABASE_URL ?? 'postgresql://invalid:invalid@localhost:5432/invalid',
  },
});
