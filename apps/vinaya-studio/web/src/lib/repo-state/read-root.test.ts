import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// `server-only` throws unconditionally on plain import — Next's bundler
// substitutes a client-detection version; plain vitest gets the real
// package. Same mock as load-state-machine.test.ts.
vi.mock('server-only', () => ({}))

// `resolveRepo: null` (forge unreachable) short-circuits every enumeration
// path in `read-root.ts` before it needs a real Milestone/derivation — the
// same safe-empty behavior every existing forge-unreachable case already
// gets. `importOriginal` keeps every other export (e.g. `labels.ts`'s
// `LABEL`, which `@attalabs/aeg-core`'s own module graph needs) real —
// overriding the whole module drags those out from under an unrelated
// import chain.
vi.mock('@attalabs/aeg-forge-state', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@attalabs/aeg-forge-state')>()
  return { ...actual, resolveRepo: vi.fn(async () => null) }
})

import {
  __resetAegRootCacheForTests,
  findAegRoot,
  listProjectViews,
  readRegistry,
  resolveProjectView,
  tranchesWithNoProject
} from './read-root.js'
import { DEFAULT_BOARD_SLUG } from './default-board-slug.js'

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
    expect(findAegRoot(dir)).toBe(dir)
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
    expect(findAegRoot(nested)).toBe(dir)
  })

  it('does not throw when the walk reaches the filesystem root without finding a marker', () => {
    expect(existsSync(join(dir, '.vinaya', 'projects.md'))).toBe(false)
    expect(() => findAegRoot(dir)).not.toThrow()
    expect(findAegRoot(dir)).toBeNull()
  })

  it('a failed search is never cached — a registry created after the first call is picked up by the next, same-process call with no reset', () => {
    expect(findAegRoot(dir)).toBeNull()
    mkdirSync(join(dir, '.vinaya'), { recursive: true })
    writeFileSync(
      join(dir, '.vinaya', 'projects.md'),
      '## Registry\n\n| Project | Path | Specs | Per-project state |\n|---|---|---|---|\n'
    )
    expect(findAegRoot(dir)).toBe(dir)
  })
})

/**
 * Registry-optional resolution (#811). `resolveProjectView`/`listProjectViews`
 * accept `startDir` (test-only, mirroring `readRegistry`) so the
 * registry-present branch is provable against a real fixture without
 * `VINAYA_REPO_ROOT`/`process.chdir()` gymnastics — it reuses `readProject`/
 * `readRegistry` verbatim, so this also pins the byte-identity guarantee: a
 * registered name resolves exactly like `readProject` already did, and an
 * unregistered one still resolves to nothing (never a forge-derived board).
 * The registry-absent branch is exercised against a forge mocked
 * unreachable (`resolveRepo` → `null`, above) — every enumeration path
 * degrades to `[]` before needing a real Milestone, so this proves the
 * registry-absent path never crashes and never fabricates a name the forge
 * never actually returned.
 */
describe('resolveProjectView / listProjectViews — registry-optional (#811)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'read-root-test-'))
    __resetAegRootCacheForTests()
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('registry present: a registered name resolves exactly like readProject', async () => {
    mkdirSync(join(dir, '.vinaya'), { recursive: true })
    writeFileSync(
      join(dir, '.vinaya', 'projects.md'),
      '## Registry\n\n| Project | Path | Specs | Per-project state |\n|---|---|---|---|\n| mobile | `apps/mobile` | `apps/mobile/specs` | (state tracked globally) |\n'
    )
    await expect(resolveProjectView('mobile', dir)).resolves.toEqual({
      kind: 'registered',
      project: { name: 'mobile', path: 'apps/mobile', specsPath: 'apps/mobile/specs', statePath: null }
    })
  })

  it('registry present: an unregistered name resolves to nothing — never a forge-derived board', async () => {
    mkdirSync(join(dir, '.vinaya'), { recursive: true })
    writeFileSync(
      join(dir, '.vinaya', 'projects.md'),
      '## Registry\n\n| Project | Path | Specs | Per-project state |\n|---|---|---|---|\n'
    )
    await expect(resolveProjectView('mobile', dir)).resolves.toBeUndefined()
  })

  it('registry absent: the reserved default slug resolves without touching the forge', async () => {
    await expect(resolveProjectView(DEFAULT_BOARD_SLUG, dir)).resolves.toEqual({ kind: 'default' })
  })

  it('registry absent, forge unreachable: any other name resolves to nothing rather than fabricating a board', async () => {
    await expect(resolveProjectView('vada', dir)).resolves.toBeUndefined()
  })

  it('listProjectViews: registry present returns the real rows', async () => {
    mkdirSync(join(dir, '.vinaya'), { recursive: true })
    writeFileSync(
      join(dir, '.vinaya', 'projects.md'),
      '## Registry\n\n| Project | Path | Specs | Per-project state |\n|---|---|---|---|\n| mobile | `apps/mobile` | `apps/mobile/specs` | (state tracked globally) |\n'
    )
    await expect(listProjectViews(dir)).resolves.toEqual({
      registryPresent: true,
      projects: [{ name: 'mobile', path: 'apps/mobile', specsPath: 'apps/mobile/specs', statePath: null }]
    })
  })

  it('listProjectViews: registry absent, forge unreachable, returns no fabricated names', async () => {
    await expect(listProjectViews(dir)).resolves.toEqual({ registryPresent: false, projects: [] })
  })

  it('tranchesWithNoProject: forge unreachable degrades to empty lists, not a throw', async () => {
    await expect(tranchesWithNoProject()).resolves.toEqual({
      active: [],
      archived: [],
      forge: { active: { kind: 'unreachable' }, archived: { kind: 'unreachable' } }
    })
  })
})
