import { describe, expect, it } from 'vitest'
import { nestDocChildren } from './nest-doc-children'
import type { Doc } from '@attalabs/aeg-core/docs'

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
    const { topLevel } = nestDocChildren([
      makeDoc('overview'),
      makeDoc('overview/a', 'overview'),
      makeDoc('overview/b', 'overview')
    ])
    const parent = topLevel[0]!
    expect(parent.children).toHaveLength(2)
    expect(parent.children?.map((c) => c.slug)).toEqual(['overview/a', 'overview/b'])
  })

  it('flat includes all docs — parents and children', () => {
    const { flat } = nestDocChildren([
      makeDoc('roles'),
      makeDoc('roles/principal', 'roles'),
      makeDoc('roles/planner', 'roles')
    ])
    expect(flat).toHaveLength(3)
    expect(flat.map((d) => d.slug)).toContain('roles')
    expect(flat.map((d) => d.slug)).toContain('roles/principal')
    expect(flat.map((d) => d.slug)).toContain('roles/planner')
  })

  it('top-level excludes child docs', () => {
    const { topLevel } = nestDocChildren([makeDoc('contracts'), makeDoc('contracts/hiring', 'contracts')])
    expect(topLevel.map((d) => d.slug)).toEqual(['contracts'])
    expect(topLevel.map((d) => d.slug)).not.toContain('contracts/hiring')
  })

  it('flat includes grandchildren at all depths', () => {
    const { flat } = nestDocChildren([
      makeDoc('root'),
      makeDoc('root/section', 'root'),
      makeDoc('root/section/item', 'root/section')
    ])
    expect(flat).toHaveLength(3)
    expect(flat.map((d) => d.slug)).toContain('root/section/item')
  })

  it('does not mutate the input docs', () => {
    const parent = makeDoc('overview')
    const child = makeDoc('overview/a', 'overview')
    nestDocChildren([parent, child])
    expect(parent.children).toBeUndefined()
  })
})
