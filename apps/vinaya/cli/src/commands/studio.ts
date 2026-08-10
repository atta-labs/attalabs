import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import net from 'node:net'
import { dirname, join } from 'node:path'
import { packageRoot } from '../lib/package-root.js'

export type StudioTarget =
  | { kind: 'workspace'; webDir: string }
  | { kind: 'package'; packageDir: string }
  | { kind: 'missing' }

const PRIMARY_PORT = 3006
const FALLBACK_PORT = 3106

/**
 * THE resolution seam. One function, three outcomes, in this order:
 *   1. workspace — walk up from `cwd` for `apps/vinaya/web/package.json`
 *      whose `name` is `@atta/vinaya-web`. In-monorepo, this is the answer.
 *   2. package  — the published shape: this installed package's own
 *      `studio-standalone/apps/vinaya/web/server.js`, produced at publish
 *      time by `scripts/bundle-studio.ts` (`next build --output standalone`
 *      run inside the monorepo, then bundled into the tarball). Located
 *      relative to THIS module's own install root — `packageRoot()`'s
 *      caller-supplied-URL contract, same pattern `registry.ts`/`doctor.ts`
 *      already use, and why `moduleUrl` is a parameter here rather than a
 *      module-level constant: it lets a test inject a fake install root
 *      without touching the real one.
 *   3. missing  — neither found (e.g. an install predating this bundle).
 */
export function resolveStudioTarget(cwd: string, moduleUrl: string = import.meta.url): StudioTarget {
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

  const standaloneWebDir = join(packageRoot(moduleUrl), 'studio-standalone', 'apps', 'vinaya', 'web')
  if (existsSync(join(standaloneWebDir, 'server.js'))) {
    return { kind: 'package', packageDir: standaloneWebDir }
  }

  return { kind: 'missing' }
}

function spawnDev(webDir: string, args: string[]): Promise<number> {
  return new Promise((resolve) => {
    // `bun run dev` (not a direct `bun scripts/dev.ts` invocation) — bun's
    // `run` puts the workspace's node_modules/.bin on PATH for the child,
    // which `next` needs; a bare script invocation does not.
    const child = spawn('bun', ['run', 'dev', ...args], { cwd: webDir, stdio: 'inherit' })
    child.on('exit', (code) => resolve(code ?? 0))
  })
}

/** Free if the bind succeeds, taken if it errors (almost always EADDRINUSE). */
function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createServer()
    tester.once('error', () => resolve(false))
    tester.once('listening', () => tester.close(() => resolve(true)))
    tester.listen(port, '0.0.0.0')
  })
}

/** Spawns the bundled standalone Studio server. `cwd` is the CALLER's own
 *  cwd (the guest repo), not `packageDir` — `server.js`'s own require/asset
 *  resolution is relative to its own file location (verified live: it
 *  serves correctly from an unrelated cwd), which is exactly what lets the
 *  app's runtime repo-root walks (`.vinaya/projects.md`, `resolveRepo()`)
 *  target the guest's repo instead of this installed package. */
function spawnStandalone(cwd: string, serverPath: string): Promise<number> {
  return new Promise((resolve) => {
    isPortFree(PRIMARY_PORT).then((primaryFree) => {
      const port = primaryFree ? PRIMARY_PORT : FALLBACK_PORT
      if (!primaryFree) {
        console.info(`[studio] port ${PRIMARY_PORT} is taken — falling back to ${FALLBACK_PORT}`)
      }
      const child = spawn('node', [serverPath], {
        cwd,
        stdio: 'inherit',
        env: { ...process.env, PORT: String(port) }
      })
      child.on('exit', (code) => resolve(code ?? 0))
    })
  })
}

/** Runs the `studio` command. Spawns the resolved target's serve entry with
 *  stdio inherited and resolves with the child's exit code. On `missing`,
 *  prints the one-line install hint and resolves 1. `moduleUrl` forwards to
 *  `resolveStudioTarget` — see its own doc comment for why it's a param. */
export async function runStudio(cwd: string, args: string[], moduleUrl: string = import.meta.url): Promise<number> {
  const target = resolveStudioTarget(cwd, moduleUrl)

  switch (target.kind) {
    case 'workspace':
      return spawnDev(target.webDir, args)
    case 'package':
      return spawnStandalone(cwd, join(target.packageDir, 'server.js'))
    case 'missing':
      console.error(
        "Vinaya Studio isn't available in this install — try `npm install -g @attalabs/vinaya@latest` for a build that includes it."
      )
      return 1
  }
}
