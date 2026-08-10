import { describe, expect, it } from 'bun:test'
import { parseRegistry } from '@atta/aeg-core'
import { appendRegistryRow, freshProjectsRegistry, planRegistryRow } from '../src/lib/registry-write.js'

describe('registry-write', () => {
  it('freshProjectsRegistry produces content parseRegistry can read', () => {
    const content = freshProjectsRegistry('mobile', 'apps/mobile', 'apps/mobile/specs')
    const rows = parseRegistry(content)
    expect(rows).toEqual([
      { name: 'mobile', path: 'apps/mobile', specsPath: 'apps/mobile/specs', statePath: null }
    ])
  })

  it('appendRegistryRow inserts after the last existing row, keeping earlier rows intact', () => {
    const before = freshProjectsRegistry('mobile', 'apps/mobile', 'apps/mobile/specs')
    const after = appendRegistryRow(before, 'web', 'apps/web', 'apps/web/specs')
    const rows = parseRegistry(after)
    expect(rows.map((r) => r.name)).toEqual(['mobile', 'web'])
  })

  it('appendRegistryRow falls back to a fresh ## Registry section when the heading is missing', () => {
    const foreign = '# Some other file\n\nNo registry here.\n'
    const after = appendRegistryRow(foreign, 'mobile', 'apps/mobile', 'apps/mobile/specs')
    expect(after).toContain('# Some other file')
    expect(after).toContain('No registry here.')
    const rows = parseRegistry(after)
    expect(rows).toEqual([
      { name: 'mobile', path: 'apps/mobile', specsPath: 'apps/mobile/specs', statePath: null }
    ])
  })

  it('planRegistryRow classifies create-host / append-row / skip-present correctly', () => {
    const dir = `${globalThis.process.env.TMPDIR ?? '/tmp'}/registry-write-plan-${Date.now()}`
    require('node:fs').mkdirSync(dir, { recursive: true })
    const p1 = planRegistryRow(dir, 'mobile', 'apps/mobile', 'apps/mobile/specs')
    expect(p1.action).toBe('create-host')

    require('node:fs').mkdirSync(`${dir}/.vinaya`, { recursive: true })
    require('node:fs').writeFileSync(
      `${dir}/.vinaya/projects.md`,
      freshProjectsRegistry('mobile', 'apps/mobile', 'apps/mobile/specs')
    )
    const p2 = planRegistryRow(dir, 'mobile', 'apps/mobile', 'apps/mobile/specs')
    expect(p2.action).toBe('skip-present')

    const p3 = planRegistryRow(dir, 'web', 'apps/web', 'apps/web/specs')
    expect(p3.action).toBe('append-row')

    require('node:fs').rmSync(dir, { recursive: true, force: true })
  })
})
