#!/usr/bin/env bun
/**
 * Builds `apps/vinaya/web` with `next build` (`output: 'standalone'`, set in
 * its own `next.config.ts`) from inside the monorepo — the only place
 * workspace resolution of `@atta/*` packages and the `@atta/ui` codegen step
 * actually work — then copies the resulting `.next/standalone` +
 * `.next/static` + `public/` into `apps/vinaya/cli/studio-standalone/`, a
 * build-time artifact (gitignored, same convention `bundle-doctrine.ts`
 * already uses for `aeg-root/`) that `npm pack`/`npm publish` ship as a
 * normal top-level package directory.
 *
 * Next's tracing preserves the workspace-relative path from wherever
 * `next build` ran, so the standalone output nests the real entrypoint at
 * `apps/vinaya/web/server.js` *inside* the bundle — this script does not
 * flatten that. `server.js`'s own require/static resolution is relative to
 * its own file location, not `process.cwd()` (verified live: it serves
 * pages and `/_next/static/*` assets correctly when launched from an
 * unrelated cwd) — that cwd-independence is exactly what lets
 * `studio.ts`'s package branch spawn it with the *caller's* cwd, so the
 * app's own repo-root walks (`.vinaya/projects.md`, `resolveRepo()`) target
 * the guest's repo, not this installed package.
 */
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const pkgRoot = join(import.meta.dir, '..')
const monorepoRoot = join(pkgRoot, '..', '..', '..')
const webRoot = join(monorepoRoot, 'apps', 'vinaya', 'web')
const targetRoot = join(pkgRoot, 'studio-standalone')

if (!existsSync(webRoot)) {
  console.error(`bundle-studio: source ${webRoot} does not exist — run from within the attalabs monorepo.`)
  process.exit(1)
}

console.log('bundle-studio: building apps/vinaya/web (next build, output: standalone)...')
const build = spawnSync('bun', ['run', 'build'], { cwd: webRoot, stdio: 'inherit' })
if (build.status !== 0) {
  console.error('bundle-studio: next build failed.')
  process.exit(build.status ?? 1)
}

const standaloneDir = join(webRoot, '.next', 'standalone')
const staticDir = join(webRoot, '.next', 'static')
const publicDir = join(webRoot, 'public')
const standaloneWebDir = join(standaloneDir, 'apps', 'vinaya', 'web')

if (!existsSync(join(standaloneWebDir, 'server.js'))) {
  console.error(
    `bundle-studio: expected ${join(standaloneWebDir, 'server.js')} after build — standalone output is missing server.js.`
  )
  process.exit(1)
}

if (existsSync(targetRoot)) rmSync(targetRoot, { recursive: true, force: true })

cpSync(standaloneDir, targetRoot, { recursive: true })
cpSync(staticDir, join(targetRoot, 'apps', 'vinaya', 'web', '.next', 'static'), { recursive: true })
cpSync(publicDir, join(targetRoot, 'apps', 'vinaya', 'web', 'public'), { recursive: true })

console.log(`bundle-studio: copied standalone build into ${targetRoot}`)
