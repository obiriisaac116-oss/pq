import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    // Include only unit tests (e2e tests are handled by Playwright).
    include: ['tests/unit/**/*.test.ts'],
    // Keep the runner green if the suite is empty.
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
