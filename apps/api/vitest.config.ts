import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
    // Parallélisme borné : les tests d'images (sharp, natif) saturent une machine déjà chargée.
    maxWorkers: 4,
  },
});
