import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseRegistry } from './parse-registry'

const FIXTURES = join(__dirname, 'fixtures')
const projectsMd = readFileSync(join(FIXTURES, 'projects.md'), 'utf8')

describe('parseRegistry', () => {
  it('parses every row in the live projects.md, including aeg-core', () => {
    const registry = parseRegistry(projectsMd)
    expect(registry.map((p) => p.name)).toEqual(['vada', 'cetana', 'herald', 'aeg', 'aeg-core', 'atta', 'desktop'])
  })

  it('reads the aeg-core row added in this task', () => {
    const registry = parseRegistry(projectsMd)
    const aegCore = registry.find((p) => p.name === 'aeg-core')
    expect(aegCore).toMatchObject({
      name: 'aeg-core',
      path: 'packages/aeg-core',
      specsPath: 'packages/aeg-core/specs/',
      statePath: null
    })
  })

  it('captures specs paths from backtick-wrapped cells', () => {
    const registry = parseRegistry(projectsMd)
    const vada = registry.find((p) => p.name === 'vada')
    expect(vada).toMatchObject({
      name: 'vada',
      path: 'apps/vada-ai',
      specsPath: 'apps/vada-ai/specs/',
      statePath: 'apps/vada-ai/aeg-project/'
    })
  })

  it('returns statePath:null when the last cell is prose, not a path', () => {
    const registry = parseRegistry(projectsMd)
    const atta = registry.find((p) => p.name === 'atta')
    const desktop = registry.find((p) => p.name === 'desktop')
    expect(atta?.statePath).toBeNull()
    expect(desktop?.statePath).toBeNull()
    // The tracked rows still have paths — the null case is targeted.
    expect(registry.find((p) => p.name === 'aeg')?.statePath).toBe('apps/aeg/aeg-project/')
  })

  it('returns [] when the Registry section is missing', () => {
    expect(parseRegistry('# Some other doc\nNo registry here.')).toEqual([])
  })

  it('skips a malformed row without throwing', () => {
    const md = [
      '## Registry',
      '',
      '| Project | Path | Specs | State |',
      '|---------|------|-------|-------|',
      '| good    | `apps/x` | `apps/x/specs/` | `apps/x/aeg-project/` |',
      '| broken  | `apps/y` |', // 3 cells, not 4 — skipped
      ''
    ].join('\n')
    const registry = parseRegistry(md)
    expect(registry.map((p) => p.name)).toEqual(['good'])
  })
})
