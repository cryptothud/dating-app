import { FlatCompat } from '@eslint/eslintrc'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import base from './base.mjs'

// eslint-config-next is still eslintrc-format, so it has to be bridged into flat config.
// Plugins resolve from this package, which is where eslint-config-next is installed.
const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  resolvePluginsRelativeTo: import.meta.dirname,
})

/** Browser-side rules, layered on top of Next's own recommended set. */
export default tseslint.config(
  ...base,
  ...compat.extends('next/core-web-vitals'),
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      // eslint-config-next swaps in its own parser, which does not forward the project
      // options the type-checked rules need. Restore it after the compat layer.
      parser: tseslint.parser,
      globals: { ...globals.browser },
    },
    rules: {
      '@next/next/no-html-link-for-pages': 'error',
    },
  }
)
