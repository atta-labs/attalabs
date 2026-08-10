import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// `server-only` throws unconditionally on plain import — Next's bundler
// substitutes a client-detection version; plain vitest gets the real
// package. Same mock as load-state-machine.test.ts.
vi.mock('server-only', () => ({}))

import { __resetAegRootCacheForTests, findAegRoot, readRegistry } from './read-root.js'

// `findAegRoot`/`readRegistry` cache their result at module scope (real
// callers never re-derive per request); `__resetAegRootCacheForTests` clears
// that between test cases. `startDir` is passed explicitly rather than via
// `process.chdir()`.

describe('read-root — missing .vinaya/projects.md (single-project repos, #830)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'read-root-test-'))
    __resetAegRootCacheForTests()
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('findAegRoot returns null, never throws, when no .vinaya/projects.md exists anywhere above startDir', () => {
    expect(() => findAegRoot(dir)).not.toThrow()
    expect(findAegRoot(dir)).toBeNull()
  })

  it('readRegistry returns an empty array (not a throw) in the same case', async () => {
    await expect(readRegistry(dir)).resolves.toEqual([])
  })

  it('findAegRoot resolves the real root, and readRegistry reads the real rows, once .vinaya/projects.md exists', async () => {
    mkdirSync(join(dir, '.vinaya'), { recursive: true })
    writeFileSync(
      join(dir, '.vinaya', 'projects.md'),
      '## Registry\n\n| Project | Path | Specs | Per-project state |\n|---|---|---|---|\n| mobile | `apps/mobile` | `apps/mobile/specs` | (state tracked globally) |\n'
    )
    expect(findAegRoot(dir)).toBe(join(dir, 'aeg-root'))
    const registry = await readRegistry(dir)
    expect(registry).toEqual([{ name: 'mobile', path: 'apps/mobile', specsPath: 'apps/mobile/specs', statePath: null }])
  })

  it('findAegRoot walks up from a nested startDir to find .vinaya/projects.md at an ancestor', () => {
    mkdirSync(join(dir, '.vinaya'), { recursive: true })
    writeFileSync(
      join(dir, '.vinaya', 'projects.md'),
      '## Registry\n\n| Project | Path | Specs | Per-project state |\n|---|---|---|---|\n'
    )
    const nested = join(dir, 'apps', 'web')
    mkdirSync(nested, { recursive: true })
    expect(findAegRoot(nested)).toBe(join(dir, 'aeg-root'))
  })

  it('does not throw when the walk reaches the filesystem root without finding a marker', () => {
    expect(existsSync(join(dir, '.vinaya', 'projects.md'))).toBe(false)
    expect(() => findAegRoot(dir)).not.toThrow()
    expect(findAegRoot(dir)).toBeNull()
  })
})
