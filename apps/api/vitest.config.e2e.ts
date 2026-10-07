import { defineConfig } from 'vitest/config';

// Tests d'intégration : nécessitent PostgreSQL et Redis (pnpm infra:up) et une base de test migrée.
export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
