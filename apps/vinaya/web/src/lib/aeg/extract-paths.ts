import 'server-only'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { findRepoRoot, githubBlobUrl } from '../github-links'

/** A real, existence-verified repo file referenced inside a quoted piece of text. */
export type SourceLink = {
  path: string
  href: string
}

const CODE_SPAN_PATTERN = /`([^`]+)`/g
// A code span counts as a path candidate only if it looks like one: contains
// a `/` (directory separator) or a leading dot-dir, and no whitespace.
const PATH_SHAPE_PATTERN = /^(\.[a-zA-Z0-9_-]+\/|[a-zA-Z0-9_-]+\/)[^\s`]*$/

/**
 * Scans quoted markdown text for backtick code spans shaped like repo file
 * paths (e.g. `` `packages/aeg-core/bin/verify-task.ts` ``, `` `.husky/pre-push` ``)
 * and keeps only the ones that resolve to a real file on disk right now —
 * this is how the page turns the enforcement table's own prose into
 * click-through-able, currently-true links instead of a hand-maintained map.
 */
export function extractRealPathLinks(text: string): SourceLink[] {
  const repoRoot = findRepoRoot()
  const seen = new Set<string>()
  const links: SourceLink[] = []

  for (const match of text.matchAll(CODE_SPAN_PATTERN)) {
    const candidate = match[1]?.trim()
    if (!candidate || !PATH_SHAPE_PATTERN.test(candidate)) continue
    const relPath = candidate.replace(/^\.\//, '')
    if (seen.has(relPath)) continue
    const absPath = path.join(repoRoot, relPath)
    if (!existsSync(absPath)) continue
    seen.add(relPath)
    links.push({ path: relPath, href: githubBlobUrl(relPath) })
  }

  return links
}
