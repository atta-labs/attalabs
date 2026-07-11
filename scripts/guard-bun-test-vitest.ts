/**
 * Bun [test] preload guard for packages whose *.test.ts files import from
 * 'vitest' (vi.mock, etc). Bun's native test runner does not implement
 * those APIs — running `bun test` directly against such a file fails with
 * a misleading "'vi.mock(...)' is undefined" error that looks like a real
 * regression, when the actual fix is just to use the right runner.
 *
 * Wired via two mechanisms so it catches both invocation styles Bun's
 * bunfig.toml resolves (strictly by cwd, no directory walk-up):
 *   1. Root bunfig.toml  — catches `bun test <path-into-guarded-pkg>` run
 *      from the repo root.
 *   2. Package-local bunfig.toml in each guarded package — catches
 *      `cd <pkg> && bun test <file>`.
 * Both point at this same file so the logic only lives in one place.
 */

import { resolve, dirname, sep } from 'node:path'

const REPO_ROOT = dirname(import.meta.dir)

const GUARDED_PACKAGES = ['packages/aeg-core', 'packages/aeg-forge-state', 'packages/cms']

function guardedPackageFor(absPath: string): string | null {
  for (const pkg of GUARDED_PACKAGES) {
    const pkgAbs = resolve(REPO_ROOT, pkg)
    if (absPath === pkgAbs || absPath.startsWith(pkgAbs + sep)) {
      return pkg
    }
  }
  return null
}

const cwdMatch = guardedPackageFor(resolve(process.cwd()))

// Under `[test] preload`, Bun invokes this script once per test file with
// process.argv = [bunPath, absoluteTestFilePath] — not the CLI's own argv,
// so every non-flag entry (including argv[1]) is a candidate file path.
const argvMatch =
  cwdMatch ??
  process.argv
    .slice(1)
    .filter((arg) => !arg.startsWith('-'))
    .map((arg) => resolve(process.cwd(), arg))
    .map(guardedPackageFor)
    .find((pkg): pkg is string => pkg !== null) ??
  null

const matchedPackage = cwdMatch ?? argvMatch

if (matchedPackage) {
  console.error(`
✖ ${matchedPackage} tests must run via \`bun run test\` (vitest), not bare \`bun test\`.

  ${matchedPackage}/**/*.test.ts files import from 'vitest' (vi.mock, etc.),
  which Bun's native test runner does not implement. Running them under
  \`bun test\` fails with a misleading "'vi.mock(...)' is undefined" error
  that looks like a real regression but isn't.

  Run instead:
    cd ${matchedPackage} && bun run test

  See scripts/guard-bun-test-vitest.ts for details.
`)
  process.exit(1)
}
