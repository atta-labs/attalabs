import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseTranche } from './parse-tranche'

const FIXTURES = join(__dirname, 'fixtures')
const heraldMd = readFileSync(join(FIXTURES, 'herald-onto-engine.md'), 'utf8')
const aegUiMd = readFileSync(join(FIXTURES, 'aeg-ui-v1.md'), 'utf8')

describe('parseTranche: herald-onto-engine', () => {
  const iter = parseTranche(heraldMd)

  it('extracts the tranche name from the H1', () => {
    expect(iter.name).toBe('herald-onto-engine')
  })

  it('still reads the superseded `# Iteration:` H1 — history and adopter files keep it', () => {
    // The rename cannot reach into git history, and an adopter's own topology
    // files are not ours to migrate. A refused marker would surface as a
    // nameless tranche, not an error — silence is why this is pinned.
    expect(parseTranche('# Iteration: aeg-forge-state-v1 — June 2026\n').name).toBe('aeg-forge-state-v1')
    expect(parseTranche('# Tranche: aeg-forge-state-v1 — June 2026\n').name).toBe('aeg-forge-state-v1')
  })

  it('defaults to active when the lifecycle marker is absent (pre-§11 file)', () => {
    expect(iter.lifecycle).toBe('active')
  })

  it('parses all 8 topology rows in source order — and excludes prose-only ids', () => {
    expect(iter.tasks.map((t) => t.id)).toEqual(['1', '2', '3b', '4', '5', '6', '7a', '7b'])
    // The file's narrative references dropped task 3a ("Task 3a — removed; #87 closed not-planned").
    expect(iter.tasks.find((t) => t.id === '3a')).toBeUndefined()
  })

  it('captures multi-project cells', () => {
    expect(iter.tasks.find((t) => t.id === '1')?.projects).toEqual(['herald', 'engine'])
    expect(iter.tasks.find((t) => t.id === '7a')?.projects).toEqual(['engine', 'vada', 'herald'])
  })

  it('reads em-dash edge cells as empty arrays', () => {
    const t1 = iter.tasks.find((t) => t.id === '1')
    expect(t1?.dependsOn).toEqual([])
    expect(t1?.conflictsWith).toEqual([])
  })

  it('parses string task ids in edges (3b, 7a, 7b)', () => {
    expect(iter.tasks.find((t) => t.id === '7b')?.dependsOn).toEqual(['1', '7a'])
    expect(iter.tasks.find((t) => t.id === '3b')?.dependsOn).toEqual(['1'])
  })

  it('parses multi-value conflicts-with', () => {
    expect(iter.tasks.find((t) => t.id === '5')?.conflictsWith).toEqual(['2', '4'])
  })

  it('reads Issue numbers from `#NNN` cells', () => {
    expect(iter.tasks.find((t) => t.id === '1')?.issue).toBe(88)
    expect(iter.tasks.find((t) => t.id === '7a')?.issue).toBe(102)
  })

  it('captures the matching `### Task <id> — …` block per task', () => {
    const t1 = iter.tasks.find((t) => t.id === '1')
    expect(t1?.rationaleMarkdown.startsWith('### Task 1 —')).toBe(true)
    expect(t1?.rationaleMarkdown).toContain('SKEPTICAL_AUDITOR_PROMPT')
    // The block stops before the next ### heading.
    expect(t1?.rationaleMarkdown).not.toContain('### Task 2 —')
  })

  it('rationale block resolves for suffixed ids (7a / 7b)', () => {
    expect(iter.tasks.find((t) => t.id === '7a')?.rationaleMarkdown.startsWith('### Task 7a —')).toBe(true)
    expect(iter.tasks.find((t) => t.id === '7b')?.rationaleMarkdown.startsWith('### Task 7b —')).toBe(true)
  })

  it('extracts the Goal paragraph (bold markers stripped)', () => {
    expect(iter.goal).toContain('onboard')
    expect(iter.goal).toContain('Herald onto')
    expect(iter.goal).not.toContain('**')
  })

  it('returns an empty backlog when no ## Backlog section is present', () => {
    expect(iter.backlog).toEqual([])
  })
})

describe('parseTranche: aeg-ui-v1', () => {
  const iter = parseTranche(aegUiMd)

  it('extracts the tranche name', () => {
    expect(iter.name).toBe('aeg-ui-v1')
  })

  it('reads an explicit `Lifecycle: active` marker', () => {
    expect(iter.lifecycle).toBe('active')
  })

  it('parses all 8 rows (1–8, including 7 and 8 out of numeric order)', () => {
    expect(iter.tasks.map((t) => t.id)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8'])
  })

  it('aeg-core multi-project rows resolve their projects', () => {
    expect(iter.tasks.find((t) => t.id === '1')?.projects).toEqual(['aeg-core'])
    expect(iter.tasks.find((t) => t.id === '3')?.projects).toEqual(['aeg', 'aeg-core'])
    expect(iter.tasks.find((t) => t.id === '7')?.projects).toEqual(['aeg-core', 'aeg'])
  })

  it('multi-conflict edges parse', () => {
    expect(iter.tasks.find((t) => t.id === '4')?.conflictsWith).toEqual(['5', '6'])
    expect(iter.tasks.find((t) => t.id === '5')?.conflictsWith).toEqual(['4', '6'])
    expect(iter.tasks.find((t) => t.id === '6')?.conflictsWith).toEqual(['4', '5'])
  })

  it('multi-depends-on edges parse', () => {
    expect(iter.tasks.find((t) => t.id === '5')?.dependsOn).toEqual(['1', '2', '3'])
  })
})

describe('parseTranche: lifecycle marker', () => {
  it('reads Lifecycle: complete', () => {
    const md =
      '# Tranche: x — June 2026\n\nLifecycle: complete\n\n## Tasks (topology)\n\n| # | Task | Issue | Project(s) | Depends-on | Conflicts-with |\n|---|------|-------|-----------|------------|----------------|\n'
    expect(parseTranche(md).lifecycle).toBe('complete')
  })

  it('reads a bold-wrapped Lifecycle marker', () => {
    const md =
      '# Tranche: x — June 2026\n\n**Lifecycle:** complete\n\n## Tasks (topology)\n\n| # | Task | Issue | Project(s) | Depends-on | Conflicts-with |\n|---|------|-------|-----------|------------|----------------|\n'
    expect(parseTranche(md).lifecycle).toBe('complete')
  })
})

describe('parseTranche: optional backlog section', () => {
  it('captures bullets under ## Backlog when present (per §4 template)', () => {
    const md =
      '# Tranche: x — June 2026\n\nLifecycle: active\n\n## Tasks (topology)\n\n| # | Task | Issue | Project(s) | Depends-on | Conflicts-with |\n|---|------|-------|-----------|------------|----------------|\n| 1 | t | #1 | x | — | — |\n\n## Backlog (this tranche, not yet ready to dispatch)\n- Item one (issue #91)\n- Item two\n'
    expect(parseTranche(md).backlog).toEqual(['Item one (issue #91)', 'Item two'])
  })
})
