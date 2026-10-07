import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': 'error',
      // Règle E-Ciné R1 : aucune donnée chargée par le navigateur (docs/02-ARCHITECTURE.md §4).
      'no-restricted-imports': [
        'error',
        { paths: ['swr', '@tanstack/react-query', 'axios'], patterns: ['@tanstack/*'] },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='localStorage'] > Identifier[name=/token/i]",
          message: 'Aucun jeton dans le stockage du navigateur.',
        },
      ],
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'playwright-report/**',
    'test-results/**',
  ]),
]);
