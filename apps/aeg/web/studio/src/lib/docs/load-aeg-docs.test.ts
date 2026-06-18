import { describe, expect, it } from 'vitest'
import { nestDocChildren } from './nest-doc-children'
import type { Doc } from '@atta/aeg-core/docs'

function makeDoc(slug: string, parentSlug?: string): Doc {
  return {
    slug,
    title: slug,
    section: 'Test',
    order: 0,
    href: `/docs/${slug}`,
    filePath: `aeg-root/${slug}.md`,
    parentSlug
  }
}

describe('nestDocChildren', () => {
  it('nests children under their parent', () => {
    const parent = makeDoc('overview')
    const child1 = makeDoc('overview/a', 'overview')
    const child2 = makeDoc('overview/b', 'overview')
    nestDocChildren([parent, child1, child2])
    expect(parent.children).toHaveLength(2)
    expect(parent.children?.map((c) => c.slug)).toEqual(['overview/a', 'overview/b'])
  })

  it('flat includes all docs — parents and children', () => {
    const parent = makeDoc('roles')
    const child1 = makeDoc('roles/principal', 'roles')
    const child2 = makeDoc('roles/planner', 'roles')
    const { flat } = nestDocChildren([parent, child1, child2])
    expect(flat).toHaveLength(3)
    expect(flat.map((d) => d.slug)).toContain('roles')
    expect(flat.map((d) => d.slug)).toContain('roles/principal')
    expect(flat.map((d) => d.slug)).toContain('roles/planner')
  })

  it('top-level excludes child docs', () => {
    const parent = makeDoc('contracts')
    const child = makeDoc('contracts/hiring', 'contracts')
    const { topLevel } = nestDocChildren([parent, child])
    expect(topLevel.map((d) => d.slug)).toEqual(['contracts'])
    expect(topLevel.map((d) => d.slug)).not.toContain('contracts/hiring')
  })
})
