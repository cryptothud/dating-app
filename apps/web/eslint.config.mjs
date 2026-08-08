import next from '@dating-app/config/eslint-next'

export default [
  {
    ignores: [
      '.next/**',
      'out/**',
      'coverage/**',
      'node_modules/**',
      // Generated declaration files, outside the tsconfig the parser reads.
      'next-env.d.ts',
      'tailwind.config.d.ts',
    ],
  },
  ...next,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // The service worker runs in its own global scope, not the browser window's.
    files: ['public/sw.js'],
    languageOptions: {
      globals: { clients: 'readonly', self: 'readonly', caches: 'readonly' },
    },
  },
  {
    // Flat config is an array literal by design.
    files: ['eslint.config.mjs'],
    rules: { 'import/no-anonymous-default-export': 'off' },
  },
]
