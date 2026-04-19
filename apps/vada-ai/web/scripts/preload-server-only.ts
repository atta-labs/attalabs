/**
 * Bun preload shim: mocks the `server-only` package.
 *
 * Why this exists: `execute-conclusion.ts` and `execute.ts` in @atta/orchestration
 * carry `import 'server-only'` at the top, which throws unconditionally in any
 * non-Next.js context (including Bun). Test scripts that import these functions
 * directly (like test-execute-conclusion.ts) need this shim to bypass the guard.
 *
 * Usage: bun --preload ./scripts/preload-server-only.ts <script>
 *
 * Production safety: Not imported by any production code. Only loaded via
 * CLI --preload flag when running test scripts. Safe to delete if the tests
 * it supports are removed.
 */
Bun.plugin({
  name: 'mock-server-only',
  setup(build) {
    build.module('server-only', () => ({ exports: {}, loader: 'object' }))
  }
})
