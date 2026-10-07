// Configuration ESLint partagée (flat config) pour les paquets TypeScript hors Next.js.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** @param {{ tsconfigRootDir: string }} options */
export function ecineEslint({ tsconfigRootDir }) {
  return tseslint.config(
    { ignores: ['dist/**', 'coverage/**', 'src/generated/**', '**/*.config.*'] },
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
      languageOptions: {
        globals: { ...globals.node },
        parserOptions: { projectService: true, tsconfigRootDir },
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        'no-console': 'error',
      },
    },
  );
}
