#!/usr/bin/env bun
/**
 * Copies the portable doctrine subset from the monorepo's own `aeg-root/`
 * into `apps/vinaya/cli/aeg-root/` — a build-time artifact, gitignored, so
 * `npm pack`/`npm publish` (both run this via `prepack`) can ship it as a
 * normal top-level package directory, the same convention `templates/`
 * already uses. Doctrine outside the package's own directory tree can never
 * reach the tarball any other way — npm's `files` allowlist cannot reach
 * outside the package root.
 *
 * Category list is deliberately explicit, not a blanket copy of `aeg-root/`:
 * `aeg-root/tranches/` is this monorepo's own execution history, not
 * doctrine, and everything else not named here (aeg-manual-flow.md,
 * documentation-coherence.md, reviewer-prompt.md) is this-repo operational
 * prose rather than the portable core.
 */
import { cpSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const pkgRoot = join(import.meta.dir, '..')
const monorepoRoot = join(pkgRoot, '..', '..', '..')
const sourceRoot = join(monorepoRoot, 'aeg-root')
const targetRoot = join(pkgRoot, 'aeg-root')

const FILES = ['state-machine.md', 'enforcement.md', 'coordination.md', 'tranche-model.md', 'process.md', 'glossary.md']
const DIRS = ['roles', 'contracts', 'skills', 'templates']

if (!existsSync(sourceRoot)) {
  console.error(`bundle-doctrine: source ${sourceRoot} does not exist — run from within the attalabs monorepo.`)
  process.exit(1)
}

if (existsSync(targetRoot)) rmSync(targetRoot, { recursive: true, force: true })

for (const file of FILES) {
  cpSync(join(sourceRoot, file), join(targetRoot, file))
}
for (const dir of DIRS) {
  cpSync(join(sourceRoot, dir), join(targetRoot, dir), { recursive: true })
}

console.log(`bundle-doctrine: copied ${FILES.length} files + ${DIRS.length} dirs into ${targetRoot}`)
