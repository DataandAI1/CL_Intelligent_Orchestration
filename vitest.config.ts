import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}'],
  },
});
