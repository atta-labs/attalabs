import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { type DocsCoherenceEntry, evaluateDocsCoherence } from './docs-coherence'
import { parseDocFrontmatter } from './parse-doc'

const FIXTURES = join(__dirname, '..', 'fixtures', 'docs-coherence')

function walkMd(root: string, dir = ''): string[] {
  const entries = readdirSync(join(root, dir), { withFileTypes: true })
  return entries.flatMap((entry) => {
    const relPath = dir ? `${dir}/${entry.name}` : entry.name
    if (entry.isDirectory()) return walkMd(root, relPath)
    if (entry.name.endsWith('.md')) return [relPath]
    return []
  })
}

function loadTree(name: 'broken' | 'clean'): DocsCoherenceEntry[] {
  const root = join(FIXTURES, name)
  return walkMd(root).map((relPath) => {
    const raw = readFileSync(join(root, relPath), 'utf8')
    const parsed = parseDocFrontmatter(raw)
    return { relPath, frontmatter: parsed.frontmatter, body: parsed.body, firstH1: parsed.firstH1 }
  })
}

// The surfaced set is model-backed (D-079/D-087): in production it is
// `modelBackedDocPaths(deriveDiagramModel(...))`. These fixtures test the C6
// mechanism (reachability, parent refs, cross-doc links), so they pass the
// set that a model WOULD produce for each tree directly — the docs a node
// points at. The `surfaced` frontmatter override still wins over it in both
// directions (`roles/planner.md` = false, `iterations/hidden-but-surfaced.md`
// = true in the broken tree), independent of what the set contains.
const SURFACED_BROKEN = new Set(['process.md', 'roles/verifier.md'])
const SURFACED_CLEAN = new Set(['process.md', 'roles/developer.md', 'roles/reviewer.md'])

describe('evaluateDocsCoherence: broken tree', () => {
  const result = evaluateDocsCoherence(loadTree('broken'), SURFACED_BROKEN)

  it('reports a surfaced orphan (dangling parent reference)', () => {
    expect(result.errors).toContain('C6: surfaced doc "roles/verifier.md" is not reachable in the doc nav')
    expect(result.errors).toContain(
      'C6: nav entry "roles/verifier.md" points at a non-existent/excluded doc "roles/does-not-exist.md"'
    )
  })

  it('reports a dangling link between surfaced docs', () => {
    expect(result.errors).toContain('C6: link "contracts/missing.md" in "process.md" resolves to no surfaced doc')
  })

  it('does not flag the dangling link inside an excluded iteration file', () => {
    expect(result.errors.some((e) => e.includes('roles/does-not-exist.md" in "iterations/aeg-fake.md"'))).toBe(false)
  })

  it('does not flag the dangling link inside a doc excluded via surfaced: false override', () => {
    expect(result.errors.some((e) => e.includes('roles/planner.md'))).toBe(false)
  })

  it('surfaces iterations/hidden-but-surfaced.md via its surfaced: true override, with no errors of its own', () => {
    expect(result.errors.some((e) => e.includes('hidden-but-surfaced'))).toBe(false)
  })

  it('reports exactly the three expected errors — no extras', () => {
    expect(result.errors).toHaveLength(3)
  })
})

describe('evaluateDocsCoherence: clean tree', () => {
  it('passes with zero errors', () => {
    const result = evaluateDocsCoherence(loadTree('clean'), SURFACED_CLEAN)
    expect(result.errors).toEqual([])
  })
})
