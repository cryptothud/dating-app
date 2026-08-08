import globals from 'globals'
import tseslint from 'typescript-eslint'
import base from './base.mjs'

/** Server-side rules: NestJS providers and controllers are a public API surface. */
export default tseslint.config(...base, {
  files: ['**/*.ts'],
  languageOptions: {
    globals: { ...globals.node },
  },
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'error',
  },
})
