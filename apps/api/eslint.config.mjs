import nest from '@dating-app/config/eslint-nest'

export default [
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  ...nest,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        // tsconfig only includes src/**, so root-level tooling configs need the fallback.
        projectService: { allowDefaultProject: ['*.ts'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Test helpers are not a module boundary, and annotating them just pins vitest's
    // internal mock types into signatures that inference already covers.
    files: ['**/__tests__/**', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      // Fires on ordinary test-double construction rather than on real defects.
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  {
    // The Vercel entry point is deliberately CommonJS: it loads the tsc-compiled Nest
    // handler at runtime, so no decorators pass through esbuild.
    files: ['api/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { require: 'readonly', module: 'writable' },
    },
  },
]
