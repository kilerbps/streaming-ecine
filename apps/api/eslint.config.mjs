import { ecineEslint } from '@ecine/config/eslint';

export default [
  ...ecineEslint({ tsconfigRootDir: import.meta.dirname }),
  {
    // Les classes Nest injectées sont référencées par les métadonnées des décorateurs.
    rules: {
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
];
