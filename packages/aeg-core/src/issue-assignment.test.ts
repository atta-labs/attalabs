import { describe, expect, it } from 'vitest'
import { decideIssueAssignment } from './issue-assignment'

const base = {
  branch: 'task/aeg-governance-hardening/33',
  remoteRefExists: false,
  issue: 401,
  assignees: [] as string[],
  login: 'daniboomerang'
}

describe('decideIssueAssignment — branch-type scoping', () => {
  it('skips a plan branch', () => {
    const result = decideIssueAssignment({ ...base, branch: 'plan/aeg-governance-hardening' })
    expect(result.action).toBe('skip')
    expect(result.reason).toContain('not a task/<tranche>/<n> branch')
  })

  it('skips a fix branch', () => {
    const result = decideIssueAssignment({ ...base, branch: 'fix/some-bug' })
    expect(result.action).toBe('skip')
  })

  it('skips main', () => {
    const result = decideIssueAssignment({ ...base, branch: 'main' })
    expect(result.action).toBe('skip')
  })
})

describe('decideIssueAssignment — first push only', () => {
  it('skips when the remote ref already exists (not the first push)', () => {
    const result = decideIssueAssignment({ ...base, remoteRefExists: true })
    expect(result.action).toBe('skip')
    expect(result.reason).toContain('not its first push')
  })

  it('skips an already-existing remote branch even when the Issue is unassigned', () => {
    const result = decideIssueAssignment({ ...base, remoteRefExists: true, assignees: [] })
    expect(result.action).toBe('skip')
  })
})

describe('decideIssueAssignment — fail-open guards (no signal means no action)', () => {
  it('skips when no Issue could be resolved from the topology row', () => {
    const result = decideIssueAssignment({ ...base, issue: null })
    expect(result.action).toBe('skip')
    expect(result.reason).toContain('No Issue resolved')
  })

  it('skips when the assignee fetch failed, rather than risking a double-assign', () => {
    const result = decideIssueAssignment({ ...base, assignees: null })
    expect(result.action).toBe('skip')
    expect(result.reason).toContain('current assignees')
  })

  it('skips when the authenticated login is unresolvable — never assigns anyone but the pusher', () => {
    const result = decideIssueAssignment({ ...base, login: null })
    expect(result.action).toBe('skip')
    expect(result.reason).toContain('authenticated')
  })
})

describe('decideIssueAssignment — idempotency', () => {
  it('no-ops when the Issue is already assigned', () => {
    const result = decideIssueAssignment({ ...base, assignees: ['daniboomerang'] })
    expect(result.action).toBe('skip')
    expect(result.reason).toContain('already assigned')
    expect(result.reason).toContain('daniboomerang')
  })

  it('no-ops when the Issue is assigned to someone else — never re-assigns', () => {
    const result = decideIssueAssignment({ ...base, assignees: ['someone-else'] })
    expect(result.action).toBe('skip')
    expect(result.reason).toContain('already assigned')
  })
})

describe('decideIssueAssignment — the assign path', () => {
  it('assigns the authenticated pusher on a genuine first push of an unassigned task Issue', () => {
    const result = decideIssueAssignment(base)
    expect(result).toEqual({
      action: 'assign',
      issue: 401,
      login: 'daniboomerang',
      reason: expect.stringContaining('assigning Issue #401 to @daniboomerang')
    })
  })
})
