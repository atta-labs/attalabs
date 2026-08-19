import 'server-only'
import { existsSync } from 'node:fs'
import path from 'node:path'

/**
 * Walks up from process.cwd() to find the monorepo root.
 *
 * NOTE: `lib/repo-state/read-root.ts` resolves the same root by a different
 * marker — it looks for the project registry under the config directory. Both
 * land on the same directory in this repo, but they are not the same test:
 * a repo with a config and no registry resolves here and not there.
 *
 * The marker is the Vinaya config, not a governance file: `vinaya.config.json`
 * is what `vinaya init` installs and `eject` removes, so it exists in every
 * repo this code can legitimately run in. The registry it used to key on
 * (`projects.md`) is optional per-repo and would make root detection fail in a
 * repo that simply has no projects registered.
 */
const ROOT_MARKER = 'vinaya.config.json'

let cachedRepoRoot: string | null = null

export function findRepoRoot(): string {
  if (cachedRepoRoot) return cachedRepoRoot
  // Standalone Studio's server.js does `process.chdir(__dirname)` at its own
  // startup, before any request runs — `VINAYA_REPO_ROOT` is the guest
  // repo's real cwd, captured and forwarded by `spawnStandalone()`
  // (cli/src/commands/studio.ts) the same way `AEG_REPO` already is.
  let dir = process.env.VINAYA_REPO_ROOT ?? process.cwd()
  for (let i = 0; i < 8; i++) {
    if (existsSync(path.join(dir, ROOT_MARKER))) {
      cachedRepoRoot = dir
      return dir
    }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  throw new Error('Could not locate repo root (vinaya.config.json) above process.cwd()')
}

/**
 * The portable-core doctrine subset (`state-machine.md`, `enforcement.md`,
 * `roles/`, `contracts/`, etc.) ships inside the installed `@attalabs/vinaya`
 * npm package now — attalabs carries no local `aeg-root/` copy of it (see
 * `.claude/skills/vinaya-architecture/SKILL.md`).
 *
 * Tried `require.resolve('@attalabs/vinaya/package.json')` first — correct
 * under plain Node, but Turbopack's dev server only resolves packages it can
 * see referenced by a static `import`/`require` somewhere in the graph;
 * `@attalabs/vinaya` is a CLI package this app never imports as code, only
 * resolves by string, so Turbopack served back a path under its own virtual
 * `[project]` root that didn't exist on real disk (`ENOENT` on every `/docs`
 * route, confirmed live against the dev server before this fix). Composing
 * on `findRepoRoot()` instead — plain `path.join` + the bun/npm hoisting
 * guarantee that a repo-level devDependency lands in the repo's own
 * `node_modules` — is pure runtime `fs`, invisible to any bundler's static
 * module graph, the same way `findRepoRoot()`'s own walk already is.
 */
export function findAegRoot(): string {
  return path.join(findRepoRoot(), 'node_modules', '@attalabs', 'vinaya', 'aeg-root')
}

/** The forge this monorepo is hosted on — used to build clickable, verifiable source links. */
export const GITHUB_REPO = 'daniboomerang/attalabs'
export const GITHUB_DEFAULT_BRANCH = 'main'

/**
 * The standalone repo that canonically develops the engine packages
 * (`@attalabs/aeg-core`/`aeg-forge-state`/`aeg-types`/`vinaya-sources`) and
 * the CLI — attalabs holds no local copy of any of them, so a "view source"
 * link for one of their files must point here, not at this repo.
 */
export const GITHUB_VINAYA_REPO = 'atta-labs/vinaya'

/**
 * Builds a GitHub blob URL for a repo-relative path, optionally anchored to a
 * specific line — shared by any Vinaya web page that needs to link a claim
 * straight to the real source line a skeptical reader can check. Defaults to
 * this monorepo; pass `GITHUB_VINAYA_REPO` for a path that lives in the
 * standalone engine/CLI repo instead.
 */
export function githubBlobUrl(relPath: string, line?: number, repo: string = GITHUB_REPO): string {
  const base = `https://github.com/${repo}/blob/${GITHUB_DEFAULT_BRANCH}/${relPath}`
  return line ? `${base}#L${line}` : base
}

/** Same as `githubBlobUrl`, but for a directory (GitHub's `tree/` path, not `blob/`). */
export function githubTreeUrl(relPath: string): string {
  return `https://github.com/${GITHUB_REPO}/tree/${GITHUB_DEFAULT_BRANCH}/${relPath}`
}

/** Repo-relative path from an absolute path under the repo root. */
export function toRepoRelative(absPath: string): string {
  return path.relative(findRepoRoot(), absPath).replace(/\\/g, '/')
}
