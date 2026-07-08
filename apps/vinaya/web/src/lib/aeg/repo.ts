import 'server-only'
import { existsSync } from 'node:fs'
import path from 'node:path'

/**
 * Walks up from process.cwd() to find the monorepo root — same marker
 * `apps/aeg/web/studio`'s `aeg-fs/read-root.ts` uses, so both apps agree on
 * what "the repo root" means regardless of which app is running.
 */
const GOVERNANCE_MARKER = 'packages/governance/projects.md'

let cachedRepoRoot: string | null = null

export function findRepoRoot(): string {
  if (cachedRepoRoot) return cachedRepoRoot
  let dir = process.cwd()
  for (let i = 0; i < 8; i++) {
    if (existsSync(path.join(dir, GOVERNANCE_MARKER))) {
      cachedRepoRoot = dir
      return dir
    }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  throw new Error('Could not locate repo root (packages/governance/projects.md) above process.cwd()')
}

export function findAegRoot(): string {
  return path.join(findRepoRoot(), 'aeg-root')
}

/** The forge this monorepo is hosted on — used to build clickable, verifiable source links. */
export const GITHUB_REPO = 'daniboomerang/attalabs'
export const GITHUB_DEFAULT_BRANCH = 'main'

/**
 * Builds a GitHub blob URL for a repo-relative path, optionally anchored to a
 * specific line — lets every quoted claim on the page link straight to the
 * real source line a skeptical reader can check.
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
