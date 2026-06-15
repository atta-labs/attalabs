import { describe, it, expect } from 'vitest'
import { buildDocNav } from './build-doc-nav'
import type { Doc } from './types'

const doc = (overrides: Partial<Doc> & Pick<Doc, 'slug' | 'title' | 'section'>): Doc => ({
  description: undefined,
  order: 0,
  href: `/docs/${overrides.slug}`,
  filePath: `aeg-root/${overrides.slug}.md`,
  ...overrides
})

describe('buildDocNav', () => {
  it('groups docs by section, preserving insertion order when no sectionOrder is given', () => {
    const docs = [
      doc({ slug: 'roles/principal', title: 'Principal', section: 'Roles' }),
      doc({ slug: 'process', title: 'Process', section: 'Overview' }),
      doc({ slug: 'roles/planner', title: 'Planner', section: 'Roles' })
    ]
    const nav = buildDocNav(docs)
    expect(nav.sections.map((s) => s.label)).toEqual(['Roles', 'Overview'])
    expect(nav.sections[0]?.docs.map((d) => d.title)).toEqual(['Planner', 'Principal'])
  })

  it('applies sectionOrder and trails unlisted sections in insertion order', () => {
    const docs = [
      doc({ slug: 'a', title: 'A', section: 'Extras' }),
      doc({ slug: 'b', title: 'B', section: 'Overview' }),
      doc({ slug: 'c', title: 'C', section: 'Roles' })
    ]
    const nav = buildDocNav(docs, { sectionOrder: ['Overview', 'Roles'] })
    expect(nav.sections.map((s) => s.label)).toEqual(['Overview', 'Roles', 'Extras'])
  })

  it('sorts docs by order ascending then title alphabetically within a section', () => {
    const docs = [
      doc({ slug: 'a', title: 'Apple', section: 'S', order: 2 }),
      doc({ slug: 'b', title: 'Banana', section: 'S', order: 1 }),
      doc({ slug: 'c', title: 'Cherry', section: 'S', order: 1 })
    ]
    const nav = buildDocNav(docs)
    expect(nav.sections[0]?.docs.map((d) => d.title)).toEqual(['Banana', 'Cherry', 'Apple'])
  })

  it('produces a flat list in section order', () => {
    const docs = [doc({ slug: 'b', title: 'B', section: 'Two' }), doc({ slug: 'a', title: 'A', section: 'One' })]
    const nav = buildDocNav(docs, { sectionOrder: ['One', 'Two'] })
    expect(nav.flat.map((d) => d.title)).toEqual(['A', 'B'])
  })

  it('derives stable lowercased section ids', () => {
    const docs = [doc({ slug: 'a', title: 'A', section: 'Iteration Plans' })]
    const nav = buildDocNav(docs)
    expect(nav.sections[0]?.id).toBe('iteration-plans')
  })

  it('returns an empty nav when given no docs', () => {
    const nav = buildDocNav([])
    expect(nav.sections).toEqual([])
    expect(nav.flat).toEqual([])
  })
})
