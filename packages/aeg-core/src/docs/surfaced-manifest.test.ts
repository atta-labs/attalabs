import { describe, expect, it } from 'vitest'
import { isSurfacedDoc, surfacedDocs } from './surfaced-manifest'

describe('isSurfacedDoc: path rules', () => {
  it('excludes active iteration topology files', () => {
    expect(isSurfacedDoc('iterations/aeg-consolidation.md', {})).toBe(false)
  })

  it('excludes completed iteration files', () => {
    expect(isSurfacedDoc('iterations/completed/aeg-ui-v1.md', {})).toBe(false)
  })

  it('surfaces iterations/README.md as the one exception', () => {
    expect(isSurfacedDoc('iterations/README.md', {})).toBe(true)
  })

  it('excludes *.tokens.md ledgers', () => {
    expect(isSurfacedDoc('iterations/completed/aeg-ui-v1.tokens.md', {})).toBe(false)
    expect(isSurfacedDoc('some-ledger.tokens.md', {})).toBe(false)
  })

  it('excludes the projects registry', () => {
    expect(isSurfacedDoc('projects.md', {})).toBe(false)
  })

  it('excludes discovery artifacts', () => {
    expect(isSurfacedDoc('discovery/2026-06-17-governance-gaps.md', {})).toBe(false)
  })

  it('surfaces the generic framework docs', () => {
    for (const relPath of [
      'coordination.md',
      'state-machine.md',
      'aeg-manual-flow.md',
      'process.md',
      'enforcement.md',
      'reviewer-prompt.md',
      'contracts/brief-developer.md',
      'roles/developer.md',
      'diagrams/system-architecture.md',
      'skills/aeg/SKILL.md'
    ]) {
      expect(isSurfacedDoc(relPath, {})).toBe(true)
    }
  })

  it('defaults unknown future paths to surfaced', () => {
    expect(isSurfacedDoc('a-brand-new-generic-doc.md', {})).toBe(true)
    expect(isSurfacedDoc('some-new-directory/deep/doc.md', {})).toBe(true)
  })
})

describe('isSurfacedDoc: frontmatter override', () => {
  it('surfaced: false overrides a path that would otherwise be surfaced', () => {
    expect(isSurfacedDoc('roles/developer.md', { surfaced: false })).toBe(false)
  })

  it('surfaced: true overrides a path that would otherwise be excluded', () => {
    expect(isSurfacedDoc('iterations/aeg-consolidation.md', { surfaced: true })).toBe(true)
    expect(isSurfacedDoc('projects.md', { surfaced: true })).toBe(true)
    expect(isSurfacedDoc('discovery/notes.md', { surfaced: true })).toBe(true)
    expect(isSurfacedDoc('ledger.tokens.md', { surfaced: true })).toBe(true)
  })
})

describe('surfacedDocs', () => {
  it('filters a list of entries down to the surfaced subset', () => {
    const entries = [
      { relPath: 'process.md', frontmatter: {} },
      { relPath: 'iterations/aeg-consolidation.md', frontmatter: {} },
      { relPath: 'iterations/README.md', frontmatter: {} },
      { relPath: 'roles/developer.md', frontmatter: { surfaced: false } }
    ]
    expect(surfacedDocs(entries)).toEqual(['process.md', 'iterations/README.md'])
  })
})
