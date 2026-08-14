// Self-hosting detection — "does the repo we are writing into vendor the
// vinaya CLI itself?"
//
// The failure this exists for (#929): in a repo whose root `package.json`
// `workspaces` glob reaches a member declaring the name `@attalabs/vinaya`,
// `npx --yes @attalabs/vinaya <cmd>` never contacts the registry. npm sees the
// name is satisfiable from the workspace and resolves that member's declared
// `bin` — `dist/index.js` — which does not exist until something builds it, so
// every generated CI job dies with `sh: vinaya: command not found`. **The
// decision is made on the package NAME, before the version spec is read**,
// which is why no spec form (`@0.4.6`, `--package=... --`) escapes it; pinning
// was measured and abandoned.
//
// So the predicate here is exactly the condition that triggers the
// misresolution — a workspace member named `@attalabs/vinaya` — and nothing
// more. A repo without one is an ordinary adopter and must keep the published
// `npx` invocation with no build step (constraint: adopters do not pay for
// this). A repo with one gets its OWN CLI built and invoked by path, which is
// also strictly better for it: its CI then exercises the code in the pull
// request rather than a published copy predating it.
//
// Detection runs at generation time (`init` / `upgrade` / `doctor` all hold the
// repo root), so the generated YAML stays free of branching logic. It is a
// pure function of the repo's on-disk workspace declaration, which is what
// `doctor`'s drift comparison needs — the same repo always regenerates the
// same bytes.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** The published name whose presence in the workspace is what breaks `npx`. */
export const VINAYA_PACKAGE_NAME = '@attalabs/vinaya'

/** Fallback when the vendored member declares no usable `bin` entry. */
const DEFAULT_BIN = 'dist/index.js'

/** Pathological-glob backstop; real workspaces are nowhere near this. */
const MAX_CANDIDATE_DIRS = 2000

export type VendoredVinaya = {
  /** Repo-relative POSIX dir of the workspace member, e.g. `apps/cli`. */
  dir: string
  /** Repo-relative POSIX path of its `vinaya` bin, e.g. `apps/cli/dist/index.js`. */
  bin: string
}

type PackageJson = {
  name?: unknown
  bin?: unknown
  workspaces?: unknown
}

function readPackageJson(path: string): PackageJson | null {
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf-8'))
    return parsed && typeof parsed === 'object' ? (parsed as PackageJson) : null
  } catch {
    // Absent or unparseable — treated as "no workspace declaration", i.e. an
    // ordinary adopter. Detection never throws: a bad root package.json must
    // not take down `init`.
    return null
  }
}

/**
 * `workspaces` is either a bare array or `{ packages: [...] }` (the Yarn-1
 * object form npm and bun both still accept).
 */
function workspacePatterns(pkg: PackageJson | null): string[] {
  const raw = pkg?.workspaces
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { packages?: unknown }).packages)
      ? ((raw as { packages: unknown[] }).packages as unknown[])
      : []
  return list.filter((p): p is string => typeof p === 'string')
}

/** Directory children only, sorted, with `node_modules` and dotfiles skipped. */
function childDirs(absolute: string): string[] {
  try {
    return readdirSync(absolute, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.'))
      .map((e) => e.name)
      .sort()
  } catch {
    return []
  }
}

function segmentMatcher(segment: string): (name: string) => boolean {
  if (segment === '*' || segment === '**') return () => true
  const source = segment
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('[^/]*')
  const re = new RegExp(`^${source}$`)
  return (name) => re.test(name)
}

/**
 * Expand one workspace pattern into repo-relative candidate dirs. Wildcards are
 * matched a segment at a time; `**` is treated as a single level, which covers
 * every workspace layout npm/bun actually ship with (`apps/*`, `packages/*`)
 * without walking an unbounded tree.
 */
function expandPattern(repoRoot: string, pattern: string): string[] {
  const segments = pattern.split('/').filter((s) => s.length > 0 && s !== '.')
  if (segments.length === 0) return []

  let dirs: string[] = ['']
  for (const segment of segments) {
    const next: string[] = []
    for (const dir of dirs) {
      if (segment.includes('*')) {
        const matches = segmentMatcher(segment)
        for (const name of childDirs(join(repoRoot, dir))) {
          if (matches(name)) next.push(dir ? `${dir}/${name}` : name)
        }
      } else {
        next.push(dir ? `${dir}/${segment}` : segment)
      }
    }
    dirs = next.slice(0, MAX_CANDIDATE_DIRS)
  }
  return dirs
}

/** Resolve the member's `vinaya` bin path, relative to the member's own dir. */
function binPath(pkg: PackageJson): string {
  const bin = pkg.bin
  if (typeof bin === 'string') return bin.replace(/^\.\//, '')
  if (bin && typeof bin === 'object') {
    const named = (bin as Record<string, unknown>).vinaya
    if (typeof named === 'string') return named.replace(/^\.\//, '')
  }
  return DEFAULT_BIN
}

/**
 * The workspace member declaring `@attalabs/vinaya`, or `null` for the ordinary
 * adopter. Never throws — every read failure degrades to `null`.
 */
export function detectVendoredVinaya(repoRoot: string): VendoredVinaya | null {
  const patterns = workspacePatterns(readPackageJson(join(repoRoot, 'package.json')))
  const seen = new Set<string>()
  for (const pattern of patterns) {
    for (const dir of expandPattern(repoRoot, pattern)) {
      if (seen.has(dir)) continue
      seen.add(dir)
      const member = readPackageJson(join(repoRoot, dir, 'package.json'))
      if (member?.name === VINAYA_PACKAGE_NAME) {
        return { dir, bin: `${dir}/${binPath(member)}` }
      }
    }
  }
  return null
}
