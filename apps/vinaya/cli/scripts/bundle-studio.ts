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
 * unrelated cwd) — BUT that same generated `server.js` also runs
 * `process.chdir(__dirname)` as its own first line (every standalone build
 * does this, not something this script controls), so by the time app code
 * reads `process.cwd()` the process has moved off the caller's cwd and back
 * onto this installed package. `studio.ts`'s package branch works around
 * that — see its own `spawnStandalone` doc comment.
 *
 * The bundle's `node_modules` (holding `next`, `react`, `sharp`, … —
 * `server.js`'s own real runtime requires) gets renamed to `_node_modules`
 * as the final step. npm/bun's packer strips ANY directory literally named
 * `node_modules` from a published tarball, unconditionally — confirmed
 * live: `bun pm pack` silently drops this one, and the installed package
 * then fails at `require('next')`. `studio.ts`'s package branch renames it
 * back on first run (see its own comment for why that's a lazy runtime
 * repair rather than a `postinstall` script).
 *
 * `web/next.config.ts`'s `outputFileTracingIncludes` bakes THIS monorepo's
 * own `aeg-root/`, `.vinaya/projects.md`, and `vinaya.config.json` into the
 * standalone output at the bundle root — correct for the hosted
 * `vinaya.attalabs.dev` deployment (same repo, own facts belong there), but
 * wrong once the identical build is repurposed as a portable per-adopter CLI
 * artifact: at least three separate `process.cwd()`-walking readers in
 * `web/src/lib/**` (the project registry, the doctrine loader, the
 * GitHub-link marker) would otherwise silently find and serve THIS repo's
 * own facts to every guest instead of the guest's own (or a graceful empty
 * state) — confirmed live in code review (`/studio/projects` returning
 * `herald`/`vada`/`vinaya`, `/docs/harness` returning `attalabs`), and
 * structurally guaranteed to recur for any *future* cwd-walking reader too.
 * Rather than patching each call site individually (fragile — reviewers
 * cannot audit every present and future walker), this script deletes the
 * three baked-in paths from the shipped bundle outright: with nothing of
 * this repo's own left to find, every walker's normal upward search either
 * reaches the GUEST's own equivalent file (since `node_modules` sits inside
 * the guest's own repo tree once installed) or fails exactly the same
 * graceful/absent way it already does for any repo with no such file.
 */
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { STUDIO_NODE_MODULES_PACKED_DIRNAME } from '../src/lib/studio-bundle.js'

const pkgRoot = join(import.meta.dir, '..')
const monorepoRoot = join(pkgRoot, '..', '..', '..')
const webRoot = join(monorepoRoot, 'apps', 'vinaya', 'web')
const targetRoot = join(pkgRoot, 'studio-standalone')

if (!existsSync(webRoot)) {
  console.error(`bundle-studio: source ${webRoot} does not exist — run from within the attalabs monorepo.`)
  process.exit(1)
}

// MUST run before the build, not just before the copy: `next build`'s
// tracer roots at the monorepo (`outputFileTracingRoot`), and a stale
// `studio-standalone/` left on disk from a prior run gets swept back into
// the NEW standalone output as a real, non-symlinked nested copy of this
// very directory — confirmed live: a second build produced
// `studio-standalone/apps/vinaya/cli/studio-standalone/...` recursively.
// Cleaning the target first means there's nothing stale for the tracer to
// find.
if (existsSync(targetRoot)) rmSync(targetRoot, { recursive: true, force: true })

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

cpSync(standaloneDir, targetRoot, { recursive: true })
cpSync(staticDir, join(targetRoot, 'apps', 'vinaya', 'web', '.next', 'static'), { recursive: true })
cpSync(publicDir, join(targetRoot, 'apps', 'vinaya', 'web', 'public'), { recursive: true })

const realNodeModules = join(targetRoot, 'node_modules')
const packedNodeModules = join(targetRoot, STUDIO_NODE_MODULES_PACKED_DIRNAME)
if (existsSync(realNodeModules)) {
  renameSync(realNodeModules, packedNodeModules)
}

// This repo's own facts, baked in by outputFileTracingIncludes for the
// hosted deployment's benefit — not the guest's to see. See this file's own
// top comment for the full reasoning.
const monorepoOwnFacts = ['aeg-root', '.vinaya', 'vinaya.config.json']
for (const name of monorepoOwnFacts) {
  const p = join(targetRoot, name)
  if (existsSync(p)) rmSync(p, { recursive: true, force: true })
}

console.log(`bundle-studio: copied standalone build into ${targetRoot}`)
