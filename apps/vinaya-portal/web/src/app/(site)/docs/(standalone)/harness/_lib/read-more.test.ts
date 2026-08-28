import type { DiagramNode } from '@attalabs/aeg-core'
import { describe, expect, it } from 'vitest'
import { readMoreHref } from './read-more'

describe('readMoreHref', () => {
  it('links a gate node to its ring page at its own anchored section', () => {
    const node: DiagramNode = {
      id: 'gate:pre-commit',
      kind: 'gate',
      label: 'pre-commit',
      ringIndex: 0,
      renderState: 'active',
      sourceLine: 42
    }
    expect(readMoreHref(node)).toBe('/docs/rings/ring-0#pre-commit')
  })

  it('links a check node to its ring page at its own anchored section', () => {
    const node: DiagramNode = {
      id: 'check:typecheck',
      kind: 'check',
      label: 'typecheck',
      ringIndex: 1,
      renderState: 'active',
      sourceLine: 100
    }
    expect(readMoreHref(node)).toBe('/docs/rings/ring-1#typecheck')
  })

  it('links a role node to its public role page', () => {
    const node: DiagramNode = { id: 'role:developer', kind: 'role', label: 'developer', renderState: 'active' }
    expect(readMoreHref(node)).toBe('/docs/roles/developer')
  })

  it('links a contract node to its public contract page', () => {
    const node: DiagramNode = {
      id: 'contract:brief-developer',
      kind: 'contract',
      label: 'brief-developer',
      renderState: 'active'
    }
    expect(readMoreHref(node)).toBe('/docs/contracts/brief-developer')
  })

  it('links an action node to its public section on the actions page', () => {
    const node: DiagramNode = {
      id: 'action:commit-the-work',
      kind: 'action',
      label: 'commit the work',
      renderState: 'active'
    }
    expect(readMoreHref(node)).toBe('/docs/actions#commit-the-work')
  })
})
