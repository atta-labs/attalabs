import { join } from 'node:path'
import { packageRoot } from '../lib/package-root.js'
import type { CheckSpec } from './contract'

// `packageRoot(import.meta.url)` walks up to the nearest `package.json`
// rather than a fixed `../..` — the fixed depth was correct only when
// running unbundled from `src/checks/`; once bundled into a single-file
// `dist/index.js` (what a real `npm install` ships), the depth from the
// bundled file to the package root differs, and a fixed walk landed every
// `BIN_DIR`-derived path one directory short. `BIN_DIR` is still computed
// once at module scope: the package root a check's bin resolves against
// never changes at runtime.
const BIN_DIR = join(packageRoot(import.meta.url), 'src', 'checks', 'bin')

/**
 * The four core AEG gates an adopter's repo actually runs, expressed as
 * ordinary `CheckSpec`s — the exact shape a `vinaya.config.json` entry
 * produces. No extra field, no privileged flag: this IS the
 * no-privileged-API proof, not a stylistic choice. See
 * `tests/checks/no-privileged-api.test.ts`.
 *
 * `reader-resolvable-prose` is NOT registered here: it hardcodes this
 * monorepo's own doctrine layout
 * (`aeg-root/glossary.md`, `aeg-root/tranches/completed/`) and this
 * monorepo's own marketing-site source path
 * (`apps/vinaya/web/src/app/(site)/**\/page.tsx`) — a scope-registration bug,
 * not a pathing one. No `packageRoot()`-style fix makes those paths exist in
 * an arbitrary adopter's repo. The check's bin and its underlying
 * `@atta/aeg-core` logic are left in place — they may still be useful as this
 * repo's own internal doc-quality tool — but they are reachable only by
 * direct invocation, never through this adopter-facing registry.
 */
export function coreCheckRegistry(): CheckSpec[] {
  return [
    {
      name: 'brief-shape',
      run: join(BIN_DIR, 'check-brief-shape.ts'),
      scope: 'diff',
      timeoutMs: 15_000
    },
    {
      name: 'doc-coverage',
      run: join(BIN_DIR, 'check-doc-coverage.ts'),
      scope: 'diff',
      timeoutMs: 15_000
    },
    {
      name: 'coherence',
      run: join(BIN_DIR, 'check-coherence.ts'),
      scope: 'full',
      timeoutMs: 30_000
    },
    {
      name: 'dispatch-readiness',
      run: join(BIN_DIR, 'check-dispatch-readiness.ts'),
      scope: 'full',
      timeoutMs: 30_000
    },
    {
      name: 'closes-n',
      run: join(BIN_DIR, 'check-closes-n.ts'),
      scope: 'diff',
      timeoutMs: 15_000
    },
    {
      name: 'single-plan-pr',
      run: join(BIN_DIR, 'check-single-plan-pr.ts'),
      scope: 'diff',
      timeoutMs: 15_000
    },
    {
      name: 'test-plan',
      run: join(BIN_DIR, 'check-test-plan.ts'),
      scope: 'diff',
      timeoutMs: 15_000
    },
    {
      name: 'no-disk-state',
      run: join(BIN_DIR, 'check-no-disk-state.ts'),
      scope: 'diff',
      timeoutMs: 15_000
    },
    {
      name: 'registry-gates',
      run: join(BIN_DIR, 'check-registry-gates.ts'),
      scope: 'full',
      timeoutMs: 30_000
    },
    {
      name: 'review-gate',
      run: join(BIN_DIR, 'check-review-gate.ts'),
      scope: 'full',
      timeoutMs: 30_000
    },
    {
      name: 'branch-topology',
      run: join(BIN_DIR, 'check-branch-topology.ts'),
      scope: 'full',
      timeoutMs: 30_000
    },
    {
      name: 'dead-branch-push',
      run: join(BIN_DIR, 'check-dead-branch-push.ts'),
      scope: 'full',
      timeoutMs: 30_000
    },
    {
      name: 'first-push-dispatch',
      run: join(BIN_DIR, 'check-first-push-dispatch.ts'),
      scope: 'full',
      timeoutMs: 30_000
    },
    {
      name: 'doc-coverage-push',
      run: join(BIN_DIR, 'check-doc-coverage-push.ts'),
      scope: 'diff',
      timeoutMs: 15_000
    },
    {
      name: 'issue-assignment',
      run: join(BIN_DIR, 'check-issue-assignment.ts'),
      scope: 'full',
      timeoutMs: 30_000
    }
  ]
}
