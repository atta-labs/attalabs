import { describe, it, expect } from 'vitest'
import { buildDocNav } from './build-doc-nav'
import { findDoc, getNextDoc, getPrevDoc } from './nav-helpers'
import type { Doc } from './types'

const doc = (slug: string, title: string, section: string): Doc => ({
  slug,
  title,
  description: undefined,
  section,
  order: 0,
  href: `/docs/${slug}`,
  filePath: `aeg-root/${slug}.md`
})

const nav = buildDocNav(
  [
    doc('process', 'Process', 'Overview'),
    doc('roles/planner', 'Planner', 'Roles'),
    doc('roles/principal', 'Principal', 'Roles')
  ],
  { sectionOrder: ['Overview', 'Roles'] }
)

describe('findDoc', () => {
  it('returns the doc when slug matches', () => {
    expect(findDoc(nav, 'roles/planner')?.title).toBe('Planner')
  })

  it('returns undefined when slug is missing', () => {
    expect(findDoc(nav, 'nope')).toBeUndefined()
  })
})

describe('getNextDoc', () => {
  it('returns the next doc across sections', () => {
    expect(getNextDoc(nav, 'process')?.slug).toBe('roles/planner')
  })

  it('returns undefined at the end of the flat list', () => {
    expect(getNextDoc(nav, 'roles/principal')).toBeUndefined()
  })

  it('returns undefined when slug is missing', () => {
    expect(getNextDoc(nav, 'nope')).toBeUndefined()
  })
})

describe('getPrevDoc', () => {
  it('returns the previous doc across sections', () => {
    expect(getPrevDoc(nav, 'roles/planner')?.slug).toBe('process')
  })

  it('returns undefined at the start of the flat list', () => {
    expect(getPrevDoc(nav, 'process')).toBeUndefined()
  })

  it('returns undefined when slug is missing', () => {
    expect(getPrevDoc(nav, 'nope')).toBeUndefined()
  })
})
