import { join } from 'node:path'
import { packageRoot } from '../lib/package-root.js'
import type { CheckSpec } from './contract'

// `packageRoot(import.meta.url)` walks up to the nearest `package.json`
// rather than a fixed `../..` — the fixed depth was correct only when
// running unbundled from `src/checks/`; once bundled into a single-file
// `dist/index.js` (what a real `npm install` ships), the depth from the
// bundled file to the package root differs, and a fixed walk landed every
// `BIN_DIR`-derived path one directory short (vinaya-cli-v1 task 7,
// Correction 2 — RC1). `BIN_DIR` is still computed once at module scope: the
// package root a check's bin resolves against never changes at runtime.
const BIN_DIR = join(packageRoot(import.meta.url), 'src', 'checks', 'bin')

/**
 * The four core AEG gates an adopter's repo actually runs, expressed as
 * ordinary `CheckSpec`s — the exact shape a `vinaya.config.json` entry
 * produces. No extra field, no privileged flag: this IS the
 * no-privileged-API proof, not a stylistic choice. See
 * `tests/checks/no-privileged-api.test.ts`.
 *
 * `reader-resolvable-prose` is NOT registered here (vinaya-cli-v1 task 7,
 * Correction 2 — RC3): it hardcodes this monorepo's own doctrine layout
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
    }
  ]
}
