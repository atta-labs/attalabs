import type { DiagramNode } from '@atta/aeg-core'
import { describe, expect, it } from 'vitest'
import { readMoreTarget } from './read-more'

describe('readMoreTarget', () => {
  it('links a gate node to its ring page at its own anchored section', () => {
    const node: DiagramNode = {
      id: 'gate:pre-commit',
      kind: 'gate',
      label: 'pre-commit',
      ringIndex: 0,
      renderState: 'active',
      sourceLine: 42
    }
    expect(readMoreTarget(node)).toEqual({
      path: 'aeg-root/enforcement.md',
      line: 42,
      docRoute: '/docs/rings/ring-0#pre-commit'
    })
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
    expect(readMoreTarget(node)).toEqual({
      path: 'aeg-root/enforcement.md',
      line: 100,
      docRoute: '/docs/rings/ring-1#typecheck'
    })
  })

  it('links a role node to its own roles/<id>.md file, no line', () => {
    const node: DiagramNode = { id: 'role:developer', kind: 'role', label: 'developer', renderState: 'active' }
    expect(readMoreTarget(node)).toEqual({
      path: 'aeg-root/roles/developer.md',
      docRoute: '/docs/roles/developer'
    })
  })

  it('links a contract node to its own contracts/<id>.md file, no line', () => {
    const node: DiagramNode = {
      id: 'contract:brief-developer',
      kind: 'contract',
      label: 'brief-developer',
      renderState: 'active'
    }
    expect(readMoreTarget(node)).toEqual({
      path: 'aeg-root/contracts/brief-developer.md',
      docRoute: '/docs/contracts/brief-developer'
    })
  })

  it('links an action node to its section on the actions page, source at actions.ts', () => {
    const node: DiagramNode = {
      id: 'action:commit-the-work',
      kind: 'action',
      label: 'commit the work',
      renderState: 'active'
    }
    expect(readMoreTarget(node)).toEqual({
      path: 'packages/aeg-core/src/actions.ts',
      docRoute: '/docs/actions#commit-the-work'
    })
  })
})
