import { describe, expect, it } from 'vitest'
import { checkSinglePlanPr, iterationSlugFromTopologyPath, touchesAnyTopology } from './single-plan-pr'

describe('iterationSlugFromTopologyPath', () => {
  it('parses the slug from an active iteration topology file', () => {
    expect(iterationSlugFromTopologyPath('aeg-root/iterations/aeg-governance-hardening.md')).toBe(
      'aeg-governance-hardening'
    )
  })

  it('returns null for a completed/ (archived) topology file', () => {
    expect(iterationSlugFromTopologyPath('aeg-root/iterations/completed/vada-production-v1.md')).toBeNull()
  })

  it('returns null for README.md', () => {
    expect(iterationSlugFromTopologyPath('aeg-root/iterations/README.md')).toBeNull()
  })

  it('returns null for a .tokens.md ledger file', () => {
    expect(iterationSlugFromTopologyPath('aeg-root/iterations/aeg-governance-hardening.tokens.md')).toBeNull()
  })

  it('returns null for an unrelated file', () => {
    expect(iterationSlugFromTopologyPath('packages/aeg-core/bin/open-pr.ts')).toBeNull()
  })
})

describe('checkSinglePlanPr — single-plan-PR guard (task 19 / #336)', () => {
  it('passes trivially for an ordinary task-branch PR (no topology file touched)', () => {
    const branchFiles = ['packages/aeg-core/bin/open-pr.ts', 'packages/aeg-core/bin/open-pr.test.ts']
    const otherOpenPrs = [{ number: 100, files: ['aeg-root/iterations/aeg-governance-hardening.md'] }]
    expect(checkSinglePlanPr(branchFiles, otherOpenPrs)).toEqual({ ok: true })
  })

  it('passes when two plan-branch diffs touch DIFFERENT iterations topology files', () => {
    const branchFiles = ['aeg-root/iterations/aeg-governance-hardening.md']
    const otherOpenPrs = [{ number: 200, files: ['aeg-root/iterations/aeg-forge-state-v1.md'] }]
    expect(checkSinglePlanPr(branchFiles, otherOpenPrs)).toEqual({ ok: true })
  })

  it('refuses when two plan-branch diffs touch the SAME iteration topology file, naming the other PR', () => {
    const branchFiles = ['aeg-root/iterations/aeg-governance-hardening.md']
    const otherOpenPrs = [{ number: 352, files: ['aeg-root/iterations/aeg-governance-hardening.md'] }]
    const result = checkSinglePlanPr(branchFiles, otherOpenPrs)
    expect(result.ok).toBe(false)
    expect(result.message).toContain('#352')
    expect(result.message).toContain('aeg-governance-hardening')
  })

  it('passes when no other open PR touches any topology file at all', () => {
    const branchFiles = ['aeg-root/iterations/aeg-governance-hardening.md']
    expect(checkSinglePlanPr(branchFiles, [])).toEqual({ ok: true })
  })

  it('ignores an archived (completed/) topology file touched by another PR', () => {
    const branchFiles = ['aeg-root/iterations/aeg-governance-hardening.md']
    const otherOpenPrs = [{ number: 300, files: ['aeg-root/iterations/completed/aeg-governance-hardening.md'] }]
    expect(checkSinglePlanPr(branchFiles, otherOpenPrs)).toEqual({ ok: true })
  })
})

describe('touchesAnyTopology', () => {
  it('is true when at least one file is an active topology file', () => {
    expect(touchesAnyTopology(['README.md', 'aeg-root/iterations/aeg-governance-hardening.md'])).toBe(true)
  })

  it('is false for an ordinary task-branch diff', () => {
    expect(touchesAnyTopology(['packages/aeg-core/bin/open-pr.ts', 'packages/aeg-core/src/index.ts'])).toBe(false)
  })

  it('is false for an empty file list', () => {
    expect(touchesAnyTopology([])).toBe(false)
  })
})
