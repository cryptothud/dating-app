import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['reflect-metadata'],
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.module.ts',
        'src/main.ts',
        'src/**/*.dto.ts',
        'src/**/*.guard.ts',
        'src/**/*.decorator.ts',
        'src/**/*.filter.ts',
        'src/**/*.middleware.ts',
        'src/prisma/**',
      ],
      thresholds: { lines: 70, functions: 70, branches: 65 },
    },
  },
  resolve: {
    alias: {
      '@dating-app/types': path.resolve(__dirname, '../../packages/types/src'),
    },
  },
})
