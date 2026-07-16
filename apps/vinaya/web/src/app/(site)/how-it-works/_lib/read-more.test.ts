import type { DiagramNode } from '@atta/aeg-core'
import { describe, expect, it } from 'vitest'
import { readMoreTarget } from './read-more'

describe('readMoreTarget', () => {
  it('links a gate node to enforcement.md at its sourceLine', () => {
    const node: DiagramNode = {
      id: 'gate:pre-commit',
      kind: 'gate',
      label: 'pre-commit',
      ringIndex: 0,
      renderState: 'active',
      sourceLine: 42
    }
    expect(readMoreTarget(node)).toEqual({ path: 'aeg-root/enforcement.md', line: 42 })
  })

  it('links a check node to enforcement.md at its sourceLine', () => {
    const node: DiagramNode = {
      id: 'check:typecheck',
      kind: 'check',
      label: 'typecheck',
      ringIndex: 1,
      renderState: 'active',
      sourceLine: 100
    }
    expect(readMoreTarget(node)).toEqual({ path: 'aeg-root/enforcement.md', line: 100 })
  })

  it('links a role node to its own roles/<id>.md file, no line', () => {
    const node: DiagramNode = { id: 'role:developer', kind: 'role', label: 'developer', renderState: 'active' }
    expect(readMoreTarget(node)).toEqual({ path: 'aeg-root/roles/developer.md' })
  })

  it('links a contract node to its own contracts/<id>.md file, no line', () => {
    const node: DiagramNode = {
      id: 'contract:brief-developer',
      kind: 'contract',
      label: 'brief-developer',
      renderState: 'active'
    }
    expect(readMoreTarget(node)).toEqual({ path: 'aeg-root/contracts/brief-developer.md' })
  })

  it('points action nodes at the canonical action set — no doctrine markdown backs them, actions.ts does', () => {
    const node: DiagramNode = {
      id: 'action:commit-the-work',
      kind: 'action',
      label: 'commit the work',
      renderState: 'active'
    }
    expect(readMoreTarget(node)).toEqual({ path: 'packages/aeg-core/src/actions.ts' })
  })
})
