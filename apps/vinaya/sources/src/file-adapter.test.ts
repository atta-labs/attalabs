import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createFileSource } from './file-adapter'

const FIXTURE_MD = `# Tranche: synthetic-fixture — July 2026
Lifecycle: active

Goal: Prove the file adapter reads from a configured root, not a hardcoded path.

## Tasks (topology)

| # | Task | Issue | Project(s) | Depends-on | Conflicts-with |
|---|------|-------|------------|------------|----------------|
| 1 | Synthetic task | #1 | vinaya | — | — |
`

describe('createFileSource', () => {
  let tmpRoot: string

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'vinaya-sources-file-adapter-'))
    mkdirSync(join(tmpRoot, 'aeg-root', 'tranches'), { recursive: true })
    writeFileSync(join(tmpRoot, 'aeg-root', 'tranches', 'synthetic-fixture.md'), FIXTURE_MD, 'utf-8')
  })

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true })
  })

  it('reads from the configured root, not the default aeg-root/ constant', async () => {
    const source = createFileSource({ root: join(tmpRoot, 'aeg-root') })
    const tranche = await source.getTranche('synthetic-fixture')

    expect(tranche.name).toBe('synthetic-fixture')
    expect(tranche.lifecycle).toBe('active')
    expect(tranche.goal).toBe('Prove the file adapter reads from a configured root, not a hardcoded path.')
    expect(tranche.tasks).toHaveLength(1)
    expect(tranche.tasks[0]?.id).toBe('1')
  })

  it('throws when the slug does not exist under the configured root', async () => {
    const source = createFileSource({ root: join(tmpRoot, 'aeg-root') })
    await expect(source.getTranche('does-not-exist')).rejects.toThrow()
  })
})
