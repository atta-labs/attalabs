import { describe, it, expect } from 'vitest'
import { parseDocFrontmatter, deriveTitle, stripLeadingH1 } from './parse-doc'

describe('parseDocFrontmatter', () => {
  it('extracts title, description, section, order from YAML frontmatter', () => {
    const raw = '---\ntitle: Roles\ndescription: Who does what\nsection: Overview\norder: 2\n---\n\n# Roles\n\nBody.\n'
    const out = parseDocFrontmatter(raw)
    expect(out.frontmatter.title).toBe('Roles')
    expect(out.frontmatter.description).toBe('Who does what')
    expect(out.frontmatter.section).toBe('Overview')
    expect(out.frontmatter.order).toBe(2)
    expect(out.body.trimStart().startsWith('# Roles')).toBe(true)
  })

  it('extracts sidebarTitle and sidebar_title from YAML frontmatter', () => {
    const rawCamel = '---\ntitle: Long Title\nsidebarTitle: Short Camel\n---\n\n# Long Title\n'
    const outCamel = parseDocFrontmatter(rawCamel)
    expect(outCamel.frontmatter.sidebarTitle).toBe('Short Camel')

    const rawSnake = '---\ntitle: Long Title\nsidebar_title: Short Snake\n---\n\n# Long Title\n'
    const outSnake = parseDocFrontmatter(rawSnake)
    expect(outSnake.frontmatter.sidebarTitle).toBe('Short Snake')
  })

  it('returns empty frontmatter object when no YAML block is present', () => {
    const raw = '# Process\n\nFirst paragraph.\n'
    const out = parseDocFrontmatter(raw)
    expect(out.frontmatter).toEqual({})
    expect(out.body.startsWith('# Process')).toBe(true)
  })

  it('detects the first H1 in the body', () => {
    const raw = '# Title One\n\n## Subhead\n\n# Title Two (ignored)\n'
    const out = parseDocFrontmatter(raw)
    expect(out.firstH1).toBe('Title One')
  })

  it('returns undefined firstH1 when there is no H1', () => {
    const raw = '## Just subheads\n\nBody.\n'
    const out = parseDocFrontmatter(raw)
    expect(out.firstH1).toBeUndefined()
  })

  it('ignores non-recognized frontmatter fields without throwing', () => {
    const raw = '---\nname: aeg\ndescription: A skill\nrandom: 42\n---\n\n# AEG skill\n'
    const out = parseDocFrontmatter(raw)
    expect(out.frontmatter.title).toBeUndefined()
    expect(out.frontmatter.description).toBe('A skill')
    expect(out.firstH1).toBe('AEG skill')
  })

  it('extracts a boolean surfaced frontmatter override', () => {
    const rawTrue = '---\nsurfaced: true\n---\n\n# Doc\n'
    expect(parseDocFrontmatter(rawTrue).frontmatter.surfaced).toBe(true)

    const rawFalse = '---\nsurfaced: false\n---\n\n# Doc\n'
    expect(parseDocFrontmatter(rawFalse).frontmatter.surfaced).toBe(false)
  })

  it('leaves surfaced undefined when absent or non-boolean', () => {
    const raw = '---\ntitle: Doc\n---\n\n# Doc\n'
    expect(parseDocFrontmatter(raw).frontmatter.surfaced).toBeUndefined()

    const rawBad = '---\nsurfaced: "yes"\n---\n\n# Doc\n'
    expect(parseDocFrontmatter(rawBad).frontmatter.surfaced).toBeUndefined()
  })
})

describe('deriveTitle', () => {
  it('prefers frontmatter.title over first H1', () => {
    const parsed = { frontmatter: { title: 'From FM' }, body: '', firstH1: 'From H1' }
    expect(deriveTitle(parsed, 'fallback')).toBe('From FM')
  })

  it('falls back to first H1 when no frontmatter title', () => {
    const parsed = { frontmatter: {}, body: '', firstH1: 'From H1' }
    expect(deriveTitle(parsed, 'fallback')).toBe('From H1')
  })

  it('falls back to the path-derived string when no H1 either', () => {
    const parsed = { frontmatter: {}, body: '', firstH1: undefined }
    expect(deriveTitle(parsed, 'process')).toBe('process')
  })
})

describe('stripLeadingH1', () => {
  it('removes the first H1 line plus its trailing blank line', () => {
    const out = stripLeadingH1('# Title\n\nBody here.\n')
    expect(out).toBe('Body here.\n')
  })

  it('leaves the body unchanged when there is no leading H1', () => {
    const body = '## Subhead\n\nBody.\n'
    expect(stripLeadingH1(body)).toBe(body)
  })
})
