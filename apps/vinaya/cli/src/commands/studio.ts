import { execFile, spawn } from 'node:child_process'
import { existsSync, readFileSync, renameSync } from 'node:fs'
import net from 'node:net'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
import { resolveRepo } from '@atta/aeg-forge-state'
import { packageRoot } from '../lib/package-root.js'
import { STUDIO_NODE_MODULES_PACKED_DIRNAME } from '../lib/studio-bundle.js'

const execFileAsync = promisify(execFile)

/** `resolveRepo()`'s default git exec has no `cwd` option — it always reads
 *  the CALLING process's own `process.cwd()`, which is exactly right here
 *  (called before the child's chdir, see `spawnStandalone`'s doc comment)
 *  EXCEPT this CLI's own process.cwd() isn't guaranteed to equal the `cwd`
 *  argument threaded through `resolveStudioTarget`/`runStudio` (tests pass
 *  an arbitrary fixture dir). Passing `cwd` explicitly here removes that
 *  assumption. */
function execFileForRepo(cwd: string): Promise<{ stdout: string }> {
  return execFileAsync('git', ['remote', 'get-url', 'origin'], { cwd, timeout: 5000 })
}

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

/** Repairs the pack-time rename bundle-studio.ts applies to the bundle's
 *  `node_modules` (see its own doc comment: npm/bun's packer unconditionally
 *  strips any directory literally named `node_modules`, so it ships as
 *  `_node_modules` instead). A lazy, idempotent runtime fix rather than a
 *  `postinstall` script — postinstall is routinely disabled
 *  (`--ignore-scripts`), which would leave `require('next')` broken with no
 *  recovery path; this repairs on every invocation until it's already been
 *  fixed, which costs one `existsSync` call once fixed. */
function ensureStudioNodeModules(bundleRoot: string): void {
  const real = join(bundleRoot, 'node_modules')
  const packed = join(bundleRoot, STUDIO_NODE_MODULES_PACKED_DIRNAME)
  if (!existsSync(real) && existsSync(packed)) {
    renameSync(packed, real)
  }
}

/** Spawns the bundled standalone Studio server. `cwd` is the CALLER's own
 *  cwd (the guest repo), not `packageDir` — `server.js`'s own require/asset
 *  resolution is relative to its own file location (verified live: it
 *  serves correctly from an unrelated cwd).
 *
 *  That cwd-independence does NOT extend to the APP's own runtime repo-root
 *  reads, though — Next's generated `server.js` does `process.chdir(__dirname)`
 *  as its own first line (confirmed live, every standalone build), so by the
 *  time app code calls `resolveRepo()` the process cwd is back on the
 *  installed package, not the guest repo, and a plain `git remote get-url
 *  origin` there fails with "not a git repository". `AEG_REPO` is
 *  `resolveRepo()`'s own documented override (checked before it falls back to
 *  the git lookup) — resolving it HERE, before the chdir happens, and forcing
 *  it into the child's env is what makes the chdir harmless. This is the one
 *  thing standing between this task and the exact manual "AEG_REPO env var
 *  trick" workaround the Issue names as what package mode should retire; an
 *  explicit `AEG_REPO` the caller already set is preserved (`resolveRepo`
 *  checks it first internally, so this never overrides a real override). */
async function spawnStandalone(cwd: string, serverPath: string, bundleRoot: string): Promise<number> {
  ensureStudioNodeModules(bundleRoot)

  const repo = await resolveRepo(() => execFileForRepo(cwd))
  const primaryFree = await isPortFree(PRIMARY_PORT)
  const port = primaryFree ? PRIMARY_PORT : FALLBACK_PORT
  if (!primaryFree) {
    console.info(`[studio] port ${PRIMARY_PORT} is taken — falling back to ${FALLBACK_PORT}`)
  }

  const env: NodeJS.ProcessEnv = { ...process.env, PORT: String(port) }
  if (repo) env.AEG_REPO = `${repo.owner}/${repo.repo}`

  return new Promise((resolve) => {
    const child = spawn('node', [serverPath], { cwd, stdio: 'inherit', env })
    child.on('exit', (code) => resolve(code ?? 0))
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
    case 'package': {
      // packageDir is <bundleRoot>/apps/vinaya/web — the same nesting
      // `next build`'s tracing produced and bundle-studio.ts preserved.
      const bundleRoot = join(target.packageDir, '..', '..', '..')
      return spawnStandalone(cwd, join(target.packageDir, 'server.js'), bundleRoot)
    }
    case 'missing':
      console.error(
        "Vinaya Studio isn't available in this install — try `npm install -g @attalabs/vinaya@latest` for a build that includes it."
      )
      return 1
  }
}
