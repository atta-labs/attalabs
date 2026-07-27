/**
 * Path classifiers shared by the tier-derivation and doc-owners checks.
 * Pure string predicates — no I/O.
 */

/**
 * Decision archives: frozen records of what was decided, not documentation.
 * Touching one must never satisfy C3's code-requires-docs pairing, carry a
 * tier signal, or be held to a spec's `Status:` block.
 *
 * Identified by PATH, not by a filename suffix. The suffix rule broke the
 * moment the per-product logs were restored to their original names — the
 * files were still archives, the predicate stopped believing it, and the
 * assertions that would have caught it were pointed at a synthetic path
 * instead. Naming the real files is the only form of this rule that cannot
 * silently stop applying.
 */
const FROZEN_ARCHIVES: ReadonlySet<string> = new Set([
  'docs/decisions-legacy.md',
  'apps/herald-ai/docs/herald-decisions-legacy.md',
  'apps/vada-ai/docs/vada-decisions-legacy.md'
])

export function isFrozenArchive(p: string): boolean {
  return FROZEN_ARCHIVES.has(p) || p.endsWith('-decisions-legacy.md')
}

export function isDocFile(p: string): boolean {
  return (
    (p.startsWith('aeg-root/') && p.endsWith('.md')) ||
    (p.startsWith('aeg-project/') && p.endsWith('.md')) ||
    (p.includes('/aeg-project/') && p.endsWith('.md')) ||
    (p.startsWith('.vinaya/') && p.endsWith('.md')) ||
    (p.startsWith('docs/') && p.endsWith('.md') && !isFrozenArchive(p)) ||
    (p.startsWith('apps/') && p.includes('/specs/') && p.endsWith('.md') && !isFrozenArchive(p)) ||
    (p.startsWith('.claude/skills/') && p.endsWith('.md')) ||
    p === 'docs-index.md' ||
    p === 'README.md' ||
    p === 'CLAUDE.md'
  )
}

export function isCodeFile(p: string): boolean {
  if (p.endsWith('.md')) return false
  return /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|sql|css)$/.test(p)
}

export function isSpecFile(p: string): boolean {
  return p.startsWith('apps/') && p.includes('/specs/') && p.endsWith('.md') && !isFrozenArchive(p)
}
