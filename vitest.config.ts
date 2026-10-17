import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'packages/**/src/**/*.test.ts',
      'apps/api/src/**/*.test.ts',
      'games/**/src/**/*.test.ts',
      // Pure frontend view-model and transport-mapping logic (node-safe, no DOM).
      'apps/web/lib/**/*.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
