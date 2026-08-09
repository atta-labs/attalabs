import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkG1, checkG2, checkG3, checkG4, checkG5 } from './registry-checks'
import type { GateRow } from './registry-parse'

function makeRow(overrides: Partial<GateRow> = {}): GateRow {
  return {
    ring: 'ring0',
    action: 'Some action',
    summary: 'Some summary?',
    category: 'hook',
    implementation: '',
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

describe('checkG4', () => {
  it('fails naming a fabricated number that does not resolve', () => {
    const content = 'See #99999 for context, and also #352.'
    const resolveFn = (n: number) => n !== 99999
    const result = checkG4(content, resolveFn)
    expect(result.status).toBe('fail')
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]?.reason).toContain('99999')
  })

  it('passes when every cited number resolves', () => {
    const content = 'See #352 and #474.'
    const result = checkG4(content, () => true)
    expect(result.status).toBe('pass')
    expect(result.findings).toHaveLength(0)
  })

  /**
   * Vacuity demonstration (Issue #693): `enforcement.md`'s own body carries
   * zero forge citations today — G4's real scan surface, not a synthetic
   * proxy string, is empty by policy (task 3 stripped citations from
   * `aeg-root/**` as doctrine). That leaves an open question the two tests
   * above cannot answer on their own: does the check merely happen to be
   * quiet right now, or would it actually fire if the real file carried a
   * fabricated citation? This test appends one fabricated, non-resolving
   * citation to the *real* file content and asserts `checkG4` still catches
   * it — proving the gate can see what it bans, the same discipline
   * `retired-vocabulary.test.ts` already applies to itself.
   */
  it('fires against the real enforcement.md content plus one fabricated citation', () => {
    const realContent = readFileSync(join(import.meta.dirname, '../../../aeg-root/enforcement.md'), 'utf8')
    const fabricatedNumber = 900001
    const content = `${realContent}\n\nFabricated citation for vacuity test: #${fabricatedNumber}.\n`
    const resolveFn = (n: number) => n !== fabricatedNumber
    const result = checkG4(content, resolveFn)
    expect(result.status).toBe('fail')
    expect(result.findings.some((f) => f.reason.includes(String(fabricatedNumber)))).toBe(true)
  })
})

describe('checkG5', () => {
  it('fails when a contract producer is not a real role_id', () => {
    const roles = [{ file: 'roles/planner.md', role_id: 'planner', performs: ['plan'], refuses_when: 'never' }]
    const contracts = [{ file: 'contracts/planner-brief.md', producer: 'nonexistent-role', consumer: 'planner' }]
    const result = checkG5(roles, contracts)
    expect(result.status).toBe('fail')
    expect(result.findings.some((f) => f.reason.includes('nonexistent-role'))).toBe(true)
  })

  it('fails when a role has empty performs', () => {
    const roles = [{ file: 'roles/developer.md', role_id: 'developer', performs: [], refuses_when: 'never' }]
    const result = checkG5(roles, [])
    expect(result.status).toBe('fail')
    expect(result.findings.some((f) => f.reason.includes('empty performs'))).toBe(true)
  })

  it('passes an all-valid fixture', () => {
    const roles = [
      { file: 'roles/planner.md', role_id: 'planner', performs: ['plan'], refuses_when: 'never' },
      { file: 'roles/developer.md', role_id: 'developer', performs: ['write-the-code'], refuses_when: 'no brief' }
    ]
    const contracts = [{ file: 'contracts/planner-brief.md', producer: 'planner', consumer: 'developer' }]
    const result = checkG5(roles, contracts)
    expect(result.status).toBe('pass')
    expect(result.findings).toHaveLength(0)
  })
})
