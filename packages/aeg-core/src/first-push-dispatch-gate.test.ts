import { describe, expect, it } from 'vitest'
import { checkFirstPushDispatchGate, parseTaskBranch } from './first-push-dispatch-gate'

describe('parseTaskBranch', () => {
  it('parses a well-formed task branch', () => {
    expect(parseTaskBranch('task/aeg-governance-hardening/25')).toEqual({
      iteration: 'aeg-governance-hardening',
      taskId: '25'
    })
  })

  it('rejects a plan branch', () => {
    expect(parseTaskBranch('plan/aeg-governance-hardening')).toBeNull()
  })

  it('rejects an archive branch', () => {
    expect(parseTaskBranch('archive/aeg-governance-hardening')).toBeNull()
  })

  it('rejects a fix branch', () => {
    expect(parseTaskBranch('fix/some-bug')).toBeNull()
  })

  it('rejects main', () => {
    expect(parseTaskBranch('main')).toBeNull()
  })
})

describe('checkFirstPushDispatchGate — branch-type scoping', () => {
  it('allows a plan branch regardless of readiness', () => {
    const result = checkFirstPushDispatchGate({
      branch: 'plan/aeg-governance-hardening',
      prExists: false,
      readiness: 'NOT_READY'
    })
    expect(result.verdict).toBe('allow')
    expect(result.reason).toContain('not a task/<iteration>/<n> branch')
  })

  it('allows an archive branch regardless of readiness', () => {
    const result = checkFirstPushDispatchGate({
      branch: 'archive/aeg-governance-hardening',
      prExists: false,
      readiness: 'NOT_READY'
    })
    expect(result.verdict).toBe('allow')
  })

  it('allows a fix branch regardless of readiness', () => {
    const result = checkFirstPushDispatchGate({ branch: 'fix/some-bug', prExists: false, readiness: 'NOT_READY' })
    expect(result.verdict).toBe('allow')
  })
})

describe('checkFirstPushDispatchGate — first-push vs PR-exists', () => {
  it('allows a task branch with an existing PR even when readiness is NOT_READY', () => {
    const result = checkFirstPushDispatchGate({
      branch: 'task/aeg-governance-hardening/25',
      prExists: true,
      readiness: 'NOT_READY'
    })
    expect(result.verdict).toBe('allow')
    expect(result.reason).toContain('already has an open PR')
  })

  it('blocks a task branch on its first push when NOT_READY', () => {
    const result = checkFirstPushDispatchGate({
      branch: 'task/aeg-governance-hardening/25',
      prExists: false,
      readiness: 'NOT_READY'
    })
    expect(result.verdict).toBe('refuse')
    expect(result.reason).toContain('NOT READY')
  })

  it('allows a task branch on its first push when READY', () => {
    const result = checkFirstPushDispatchGate({
      branch: 'task/aeg-governance-hardening/25',
      prExists: false,
      readiness: 'READY'
    })
    expect(result.verdict).toBe('allow')
    expect(result.reason).toContain('READY TO DISPATCH')
  })
})

describe('checkFirstPushDispatchGate — fail-open mapping', () => {
  it('allows (fails open) when readiness is UNKNOWN (forge unreachable)', () => {
    const result = checkFirstPushDispatchGate({
      branch: 'task/aeg-governance-hardening/25',
      prExists: false,
      readiness: 'UNKNOWN'
    })
    expect(result.verdict).toBe('allow')
    expect(result.reason).toContain('could not reach the forge')
  })
})
