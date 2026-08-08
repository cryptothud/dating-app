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
]
