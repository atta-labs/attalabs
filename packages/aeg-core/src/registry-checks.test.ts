import { describe, expect, it } from 'vitest'
import { checkG1, checkG2, checkG3 } from './registry-checks'
import type { GateRow } from './registry-parse'

function makeRow(overrides: Partial<GateRow> = {}): GateRow {
  return {
    ring: 'ring0',
    action: 'Some action',
    implementation: '',
    lock: '',
    line: 1,
    ...overrides
  }
}

describe('checkG1', () => {
  it('reports a missing implementation path as info, never fail', () => {
    const rows: GateRow[] = [
      makeRow({ action: 'Real file', implementation: 'real/file.ts' }),
      makeRow({ action: 'Fake file', implementation: 'does/not/exist.ts' })
    ]
    const existsFn = (path: string) => path === 'real/file.ts'
    const result = checkG1(rows, existsFn)
    expect(result.status).toBe('info')
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]?.path).toBe('does/not/exist.ts')
  })

  it('skips rows with an empty implementation (non-deterministic rows)', () => {
    const rows: GateRow[] = [makeRow({ action: 'Staleness audits', implementation: '' })]
    const result = checkG1(rows, () => false)
    expect(result.status).toBe('pass')
    expect(result.findings).toHaveLength(0)
  })

  it('never returns fail even with every path missing', () => {
    const rows: GateRow[] = [makeRow({ implementation: 'a.ts' }), makeRow({ implementation: 'b.ts' })]
    const result = checkG1(rows, () => false)
    expect(result.status).toBe('info')
    expect(result.status).not.toBe('fail')
  })
})

describe('checkG2', () => {
  it('reports a candidate file absent from every row implementation as info, never fail', () => {
    const rows: GateRow[] = [makeRow({ implementation: '.husky/pre-commit' })]
    const candidateFiles = ['.husky/pre-commit', '.husky/orphan-hook']
    const result = checkG2(rows, candidateFiles)
    expect(result.status).toBe('info')
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]?.path).toBe('.husky/orphan-hook')
  })

  it('passes when every candidate is named by some row', () => {
    const rows: GateRow[] = [makeRow({ implementation: '.husky/pre-commit' })]
    const result = checkG2(rows, ['.husky/pre-commit'])
    expect(result.status).toBe('pass')
  })
})

describe('checkG3', () => {
  it('fails when a GitHub-crossing file is not named by any Ring-0 row', () => {
    const ring0Rows: GateRow[] = [makeRow({ ring: 'ring0', implementation: 'packages/aeg-core/bin/open-pr.ts' })]
    const crossingFiles = ['packages/aeg-core/bin/open-pr.ts', 'packages/aeg-core/bin/rogue-github-caller.ts']
    const result = checkG3(ring0Rows, crossingFiles)
    expect(result.status).toBe('fail')
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]?.path).toBe('packages/aeg-core/bin/rogue-github-caller.ts')
  })

  it('passes when every crossing file is named by a Ring-0 row', () => {
    const ring0Rows: GateRow[] = [makeRow({ ring: 'ring0', implementation: 'packages/aeg-core/bin/open-pr.ts' })]
    const result = checkG3(ring0Rows, ['packages/aeg-core/bin/open-pr.ts'])
    expect(result.status).toBe('pass')
    expect(result.findings).toHaveLength(0)
  })
})
