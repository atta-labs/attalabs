import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Regression coverage for aeg-governance-hardening task 21 (#351) —
 * `currentFindingCounts()` previously fed `verify-docs`/`verify-coherence`
 * through `sh()`/`shJson()`, which swallow ANY non-zero exit to `''`/`null`.
 * Both tools exit non-zero exactly when findings exist, so the baseline
 * silently reported 0 in the one case it was supposed to catch. This mocks
 * `node:child_process`'s `execSync` to exercise every observable outcome
 * without needing the real tools to be in a specific state.
 */

const execSyncMock = vi.fn()

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>()
  return { ...actual, execSync: (...args: unknown[]) => execSyncMock(...args) }
})

const { currentFindingCounts } = await import('./verify-dispatch')

beforeEach(() => {
  execSyncMock.mockReset()
})

function throwWithStdout(stdout: string, status = 1): never {
  const err = new Error('command failed') as Error & { stdout?: string; status?: number }
  err.stdout = stdout
  err.status = status
  throw err
}

function throwSpawnFailure(): never {
  // No `.stdout` at all — simulates a spawn failure (e.g. ENOENT), never a
  // captured non-zero exit. Must not be confused with "0 findings."
  throw new Error('spawn bun ENOENT')
}

describe('currentFindingCounts', () => {
  it('(a) reports 0 when both tools exit 0 with no findings', () => {
    execSyncMock.mockImplementation((cmd: string) => {
      if (cmd.includes('verify-docs.ts')) return 'verify-docs passed (full mode).\n'
      if (cmd.includes('verify-coherence.ts')) return JSON.stringify({ summary: { passed: 5, failed: 0, info: 0 } })
      throw new Error(`unexpected command: ${cmd}`)
    })

    expect(currentFindingCounts()).toEqual([
      { tool: 'verify-docs-full', findingCount: 0, unavailable: false },
      { tool: 'verify-coherence', findingCount: 0, unavailable: false }
    ])
  })

  it('(b) counts real findings from a non-zero exit — the bug this task fixes', () => {
    execSyncMock.mockImplementation((cmd: string) => {
      if (cmd.includes('verify-docs.ts')) {
        return throwWithStdout(
          [
            '',
            'verify-docs FAILED (full mode) — 3 issue(s):',
            '',
            '  ✗ finding one',
            '  ✗ finding two',
            '  ✗ finding three',
            ''
          ].join('\n')
        )
      }
      if (cmd.includes('verify-coherence.ts')) {
        return throwWithStdout(JSON.stringify({ summary: { passed: 2, failed: 4, info: 0 } }))
      }
      throw new Error(`unexpected command: ${cmd}`)
    })

    expect(currentFindingCounts()).toEqual([
      { tool: 'verify-docs-full', findingCount: 3, unavailable: false },
      { tool: 'verify-coherence', findingCount: 4, unavailable: false }
    ])
  })

  it('(c) reports UNAVAILABLE, never 0, when a tool cannot run at all (spawn failure)', () => {
    execSyncMock.mockImplementation(() => throwSpawnFailure())

    expect(currentFindingCounts()).toEqual([
      { tool: 'verify-docs-full', findingCount: 0, unavailable: true },
      { tool: 'verify-coherence', findingCount: 0, unavailable: true }
    ])
  })

  it('(c) reports UNAVAILABLE for verify-coherence when --json output is a crash, not a report', () => {
    execSyncMock.mockImplementation((cmd: string) => {
      if (cmd.includes('verify-docs.ts')) return 'verify-docs passed (full mode).\n'
      return throwWithStdout('TypeError: Cannot read properties of undefined\n    at runCoherenceChecks (...)')
    })

    const result = currentFindingCounts()

    expect(result.find((r) => r.tool === 'verify-coherence')).toEqual({
      tool: 'verify-coherence',
      findingCount: 0,
      unavailable: true
    })
  })

  it('(c) reports UNAVAILABLE for verify-docs when a non-zero exit produces no ✗ lines (crash, not a real 0)', () => {
    execSyncMock.mockImplementation((cmd: string) => {
      if (cmd.includes('verify-coherence.ts')) return JSON.stringify({ summary: { passed: 1, failed: 0, info: 0 } })
      return throwWithStdout('Segmentation fault\n')
    })

    const result = currentFindingCounts()

    expect(result.find((r) => r.tool === 'verify-docs-full')).toEqual({
      tool: 'verify-docs-full',
      findingCount: 0,
      unavailable: true
    })
  })
})

describe('(d) sh()/shJson() other call sites are untouched', () => {
  const src = readFileSync(join(import.meta.dirname, 'verify-dispatch.ts'), 'utf8')

  it("sh()'s throw-and-swallow-to-'' contract is unchanged", () => {
    const shBody = src.match(/function sh\(cmd: string\): string \{[\s\S]*?\n\}\n/)
    expect(shBody).not.toBeNull()
    expect(shBody?.[0]).toContain("stdio: ['ignore', 'pipe', 'ignore']")
    expect(shBody?.[0]).toContain("return ''")
  })

  it('every other sh()/shJson() call site (git, gh) still uses the original helpers, not the new one', () => {
    for (const needle of [
      'git ls-remote --heads origin',
      'git rev-list --count origin/main',
      'git log -1 --format=%cI',
      'gh issue view',
      'gh pr list -R ${repo.owner}/${repo.repo} --state all'
    ]) {
      expect(src).toContain(needle)
    }
    // The new capture helper is scoped to currentFindingCounts's two tool
    // invocations only — defined once, called exactly twice.
    const occurrences = src.split('captureCombinedOutput(').length - 1
    expect(occurrences).toBe(3)
  })
})

/**
 * aeg-governance-hardening task 23 (#360) — `resolvePriorIterationArchival`'s
 * `gh issue list` called with no explicit repo target, which silently returns
 * `[]` from a linked worktree checkout (the only environment this script runs
 * in during real dispatch) even when real open Issues exist. Reproduced live
 * 2026-07-04: `[]` vs 4 real Issues, same worktree, same instant. Every other
 * `gh` call in the file (`ghIssueView`, `fetchIterationBranchPrs`) had the
 * identical gap. This is a structural, source-scanning test (not a live `gh`
 * mock) because live `gh` is unmockable cheaply — same style as the `(d)`
 * suite above and task 21's `sh()`/`shJson()` call-site assertions.
 */
describe('(e) every gh invocation carries an explicit repo target (Part 1, task 23, #360)', () => {
  const src = readFileSync(join(import.meta.dirname, 'verify-dispatch.ts'), 'utf8')

  it('every `gh ...` command string passed to sh()/shJson() contains -R <owner>/<repo>', () => {
    const callPattern = /\b(?:sh|shJson(?:<[^(]*>)?)\(\s*`([^`]*)`/g
    const ghCommands: string[] = []
    let match: RegExpExecArray | null
    // biome-ignore lint/suspicious/noAssignInExpressions: standard exec-loop idiom
    while ((match = callPattern.exec(src)) !== null) {
      const cmd = match[1] as string
      if (cmd.trimStart().startsWith('gh ')) ghCommands.push(cmd)
    }
    // Fails loud if the gh calls this test targets ever get refactored away
    // from sh()/shJson() (e.g. to execSync directly) without updating this scan.
    expect(ghCommands.length).toBe(3)
    for (const cmd of ghCommands) {
      expect(cmd).toMatch(/-R \$\{repo\.owner\}\/\$\{repo\.repo\}/)
    }
  })
})
