import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.js',
      'src/**/__tests__/**/*.test.ts',
      'extensions/**/src/**/*.test.ts',
      'extensions/**/src/**/*.test.js'
    ],
    exclude: ['**/out/**', '**/dist/**', 'node_modules/**'],
    setupFiles: ['./vitest.setup.js'],
    environment: 'node',
    threads: false,
    globals: true,
  },
});
