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
  let dir = process.cwd()
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

export function findAegRoot(): string {
  return path.join(findRepoRoot(), 'aeg-root')
}

/** The forge this monorepo is hosted on — used to build clickable, verifiable source links. */
export const GITHUB_REPO = 'daniboomerang/attalabs'
export const GITHUB_DEFAULT_BRANCH = 'main'

/**
 * Builds a GitHub blob URL for a repo-relative path, optionally anchored to a
 * specific line — shared by any Vinaya web page that needs to link a claim
 * straight to the real source line a skeptical reader can check.
 */
export function githubBlobUrl(relPath: string, line?: number): string {
  const base = `https://github.com/${GITHUB_REPO}/blob/${GITHUB_DEFAULT_BRANCH}/${relPath}`
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
