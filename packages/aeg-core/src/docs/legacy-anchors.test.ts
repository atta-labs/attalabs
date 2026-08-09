import { describe, expect, it } from 'vitest'
import type { DiagramNode } from '../diagram-model'
import { legacyAnchorSlugs } from './legacy-anchors'

function node(id: string, label: string, ringIndex: 0 | 1 | 2 = 1): DiagramNode {
  return { id, kind: 'check', label, renderState: 'active', ringIndex }
}

describe('legacyAnchorSlugs', () => {
  it('a G-prefixed node returns its old g1-… slug as an alias', () => {
    expect(legacyAnchorSlugs(node('check:g1-implementation-exists', 'G1 — implementation exists'))).toEqual([
      'g1-implementation-exists'
    ])
  })

  it('an unchanged node returns no aliases', () => {
    expect(legacyAnchorSlugs(node('check:ai-review', 'AI review'))).toEqual([])
  })

  it('the long-label node returns its 127-character slug as an alias', () => {
    const label =
      'Starting the Dig (before authoring a brief) / starting Step 0 (before executing one) / every push on a task branch before its PR exists'
    const rawSlug =
      'starting-the-dig-before-authoring-a-brief-starting-step-0-before-executing-one-every-push-on-a-task-branch-before-its-pr-exists'
    expect(rawSlug).toHaveLength(127)
    expect(legacyAnchorSlugs(node(`check:${rawSlug}`, label, 0))).toEqual([rawSlug])
  })

  it('a node with no docs surface (no ringIndex) returns no aliases', () => {
    const n: DiagramNode = { id: 'check:orphan', kind: 'check', label: 'Orphan', renderState: 'active' }
    expect(legacyAnchorSlugs(n)).toEqual([])
  })
})
