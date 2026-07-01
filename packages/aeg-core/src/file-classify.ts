/**
 * Path classifiers shared by the tier-derivation and doc-owners checks.
 * Pure string predicates — no I/O.
 */

export function isDocFile(p: string): boolean {
  return (
    (p.startsWith('aeg-root/') && p.endsWith('.md')) ||
    (p.startsWith('aeg-project/') && p.endsWith('.md')) ||
    (p.includes('/aeg-project/') && p.endsWith('.md')) ||
    (p.startsWith('apps/') && p.includes('/specs/') && p.endsWith('.md')) ||
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
  return p.startsWith('apps/') && p.includes('/specs/') && p.endsWith('.md')
}

export function isDecisionLog(p: string): boolean {
  return p === 'aeg-project/decisions.md' || /-decisions\.md$/.test(p)
}
