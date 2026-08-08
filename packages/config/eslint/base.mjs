import js from '@eslint/js'
import security from 'eslint-plugin-security'
import tseslint from 'typescript-eslint'

/**
 * Rules shared by every workspace package.
 *
 * The type-checked ruleset is scoped to TypeScript files: it needs type information,
 * and consumers are responsible for pointing the parser at their own tsconfig.
 */
export default tseslint.config(
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      security.configs.recommended,
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      'no-console': 'error',
      'no-debugger': 'error',
      // Flags every computed member access, so `arr[i]` in a counted loop reports the same
      // as an attacker-controlled key. Every occurrence in this repo was the former. Index
      // safety here comes from noUncheckedIndexedAccess and validated DTOs, which check the
      // cases that actually matter; the rest of the security plugin stays on.
      'security/detect-object-injection': 'off',
    },
  },
  // Config and script files are plain JS and have no tsconfig to type-check against.
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    extends: [js.configs.recommended, tseslint.configs.disableTypeChecked],
  }
)
