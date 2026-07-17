import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export type StudioTarget =
  | { kind: 'workspace'; webDir: string }
  | { kind: 'package'; packageDir: string }
  | { kind: 'missing' }

/**
 * THE resolution seam (D-098). One function, three outcomes, in this order:
 *   1. workspace — walk up from `cwd` for `apps/vinaya/web/package.json`
 *      whose `name` is `@atta/vinaya-web`. In-monorepo, this is the answer.
 *   2. package  — the published shape: an installed `@vinaya/studio`.
 *      STUBBED: return `{ kind: 'missing' }`. Do NOT implement detection
 *      for a package that does not exist yet.
 *   3. missing  — neither.
 */
export function resolveStudioTarget(cwd: string): StudioTarget {
  let dir = cwd
  for (;;) {
    const webDir = join(dir, 'apps', 'vinaya', 'web')
    const pkgPath = join(webDir, 'package.json')
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
        if (pkg.name === '@atta/vinaya-web') {
          return { kind: 'workspace', webDir }
        }
      } catch {
        // malformed package.json — keep walking up
      }
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }

  // D-098: the published-package branch is a publish-time shape that does
  // not exist yet. Stub only — do not implement `@vinaya/studio` detection.
  return { kind: 'missing' }
}

function spawnDev(webDir: string, args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn('bun', ['scripts/dev.ts', ...args], { cwd: webDir, stdio: 'inherit' })
    child.on('exit', (code) => resolve(code ?? 0))
  })
}

/** Runs the `studio` command. Spawns the resolved target's serve entry with
 *  stdio inherited and resolves with the child's exit code. On `missing`,
 *  prints the one-line install hint and resolves 1. */
export async function runStudio(cwd: string, args: string[]): Promise<number> {
  const target = resolveStudioTarget(cwd)

  switch (target.kind) {
    case 'workspace':
      return spawnDev(target.webDir, args)
    case 'package':
      return spawnDev(target.packageDir, args)
    case 'missing':
      console.error("Vinaya Studio isn't available here — install '@vinaya/studio' to run it standalone.")
      return 1
  }
}
