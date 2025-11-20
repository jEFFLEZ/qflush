import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'src/tests/legacy-runner.spec.ts',
      'src/**/__tests__/**/*.test.ts',
      'extensions/**/src/**/*.test.ts'
    ],
    exclude: ['**/out/**', '**/dist/**', 'node_modules/**'],
    setupFiles: ['./vitest.setup.js'],
    environment: 'node',
    threads: false,
    globals: true,
    testTimeout: 20000,
  },
});
