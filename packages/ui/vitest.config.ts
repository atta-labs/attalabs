import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['engine-flow/**/*.test.ts', 'doc-collector/**/*.test.ts', 'lib/**/*.test.ts']
  }
})
