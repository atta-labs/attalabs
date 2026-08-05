/**
 * Path classifiers shared by the tier-derivation and doc-owners checks.
 * Pure string predicates — no I/O.
 */

/**
 * Decision archives: frozen records of what was decided, not documentation.
 * Touching one must never satisfy C3's code-requires-docs pairing, carry a
 * tier signal, or be held to a spec's `Status:` block.
 *
 * Recognized by filename suffix, never by an enumerated path list. An earlier
 * form of this predicate hardcoded each consumer's archive by full path, which
 * put specific product names inside a package that ships to adopters who have
 * neither. The suffix is the actual rule — a file named `…decisions-legacy.md`
 * is an archive in any repo — and it subsumes every path that list held, so
 * the coupling was removable with no behavior change.
 *
 * The historical failure the path list was added to prevent (renaming an
 * archive out of recognition) is not re-opened: the earlier rule required a
 * `-decisions-legacy.md` suffix and so missed a top-level `decisions-legacy.md`
 * with no prefix, which is why the list existed at all. Matching the bare
 * suffix covers both shapes.
 */
export function isFrozenArchive(p: string): boolean {
  return p.endsWith('decisions-legacy.md')
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
