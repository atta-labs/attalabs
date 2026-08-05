import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runDemoBreak } from '../src/commands/demo.js'

// The real CLI source, invoked directly by `bun` rather than through a
// published `npx vinaya` — there is nothing to `npx` resolve from a disposable
// test fixture. This still runs the exact same runner/registry/check code a
// real install does; only the shell wrapper differs.
const INDEX_TS = fileURLToPath(new URL('../src/index.ts', import.meta.url))

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
}

/**
 * A REAL git hook, invoked by git itself on `git commit` — not a simulated
 * call into the check runner. Uses `.git/hooks` (git's own default hook
 * path) rather than `.husky`, since a bare `.husky/pre-commit` file with no
 * husky bootstrap never gets wired to `core.hooksPath` — it would silently
 * never fire.
 */
function installRealHook(root: string): void {
  const body = `#!/usr/bin/env sh\nbun ${INDEX_TS} check --all --diff-only || exit 1\n`
  writeFileSync(join(root, '.git/hooks/pre-commit'), body, { mode: 0o755 })
}

function initFixture(): string {
  const root = join(tmpdir(), `vinaya-demo-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(root, { recursive: true })
  git(root, ['init', '-q', '-b', 'main'])
  git(root, ['config', 'user.email', 'test@example.com'])
  git(root, ['config', 'user.name', 'Test'])
  writeFileSync(join(root, 'README.md'), '# fixture\n')
  git(root, ['add', 'README.md'])
  git(root, ['commit', '-q', '-m', 'Chore: initial commit'])
  installRealHook(root)
  return root
}

/** Capture process.stdout.write output during `fn`, returning the output. */
async function captureStdout(fn: () => Promise<unknown>): Promise<string> {
  const original = process.stdout.write.bind(process.stdout)
  let buf = ''
  process.stdout.write = ((chunk: string) => {
    buf += chunk
    return true
  }) as typeof process.stdout.write
  try {
    await fn()
  } finally {
    process.stdout.write = original
  }
  return buf
}

let root: string

beforeEach(() => {
  root = initFixture()
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('vinaya demo break', () => {
  it('refuses the malformed commit with the real check error, fixes, passes, and cleans up — twice, without touching the original branch or leaving stray branches', async () => {
    for (let run = 1; run <= 2; run++) {
      const beforeBranch = git(root, ['rev-parse', '--abbrev-ref', 'HEAD'])
      const beforeHead = git(root, ['rev-parse', 'HEAD'])
      expect(beforeBranch).toBe('main')
      expect(git(root, ['status', '--porcelain'])).toBe('')

      let code = -1
      const out = await captureStdout(async () => {
        code = await runDemoBreak(root, [])
      })
      expect(code, `run ${run} output:\n${out}`).toBe(0)

      // the real refusal came from the real check, not a scripted string
      expect(out).toContain('✗ Commit refused')
      expect(out).toContain(
        'brief-validation tier: no `Tier:` field found in the PR body (expected `Tier: 0|1|3` or `**Tier:** 0|1|3`).'
      )
      expect(out).toContain('✓ Commit passed — the fix worked.')
      expect(out).toContain('Cleaned up')

      const afterBranch = git(root, ['rev-parse', '--abbrev-ref', 'HEAD'])
      const afterHead = git(root, ['rev-parse', 'HEAD'])
      expect(afterBranch, `run ${run}`).toBe('main')
      expect(afterHead, `run ${run}: original branch must not move`).toBe(beforeHead)
      expect(git(root, ['status', '--porcelain']), `run ${run}`).toBe('')

      const stray = git(root, ['for-each-ref', '--format=%(refname:short)', 'refs/heads/vinaya/demo-break-*'])
      expect(stray, `run ${run}: no stray demo branch may survive`).toBe('')
    }
  }, 30_000)

  it('--keep leaves the demo branch checked out and removes the crash-recovery state file', async () => {
    let code = -1
    const out = await captureStdout(async () => {
      code = await runDemoBreak(root, ['--keep'])
    })
    expect(code).toBe(0)
    expect(out).toContain('--keep: leaving')

    const branch = git(root, ['rev-parse', '--abbrev-ref', 'HEAD'])
    expect(branch.startsWith('vinaya/demo-break-')).toBe(true)

    const gitDir = git(root, ['rev-parse', '--git-dir'])
    const stateAbs = gitDir.startsWith('/') ? gitDir : join(root, gitDir)
    expect(existsSync(join(stateAbs, 'vinaya-demo-state.json'))).toBe(false)
  }, 15_000)

  it('refuses on a dirty working tree without touching anything', async () => {
    writeFileSync(join(root, 'dirty.txt'), 'uncommitted\n')
    const before = git(root, ['status', '--porcelain'])

    let code = -1
    await captureStdout(async () => {
      code = await runDemoBreak(root, [])
    })
    expect(code).toBe(1)
    expect(git(root, ['status', '--porcelain'])).toBe(before)
    expect(git(root, ['rev-parse', '--abbrev-ref', 'HEAD'])).toBe('main')
  })

  it('refuses when hooks are not installed, without creating a branch', async () => {
    rmSync(join(root, '.git/hooks/pre-commit'), { force: true })
    const beforeBranch = git(root, ['rev-parse', '--abbrev-ref', 'HEAD'])

    let code = -1
    await captureStdout(async () => {
      code = await runDemoBreak(root, [])
    })
    expect(code).toBe(1)
    expect(git(root, ['rev-parse', '--abbrev-ref', 'HEAD'])).toBe(beforeBranch)
    expect(git(root, ['for-each-ref', '--format=%(refname:short)', 'refs/heads/vinaya/demo-break-*'])).toBe('')
  })

  it('recovers from a crashed prior run (stray branch + state file) before starting fresh', async () => {
    // Simulate a crash: leave a stray demo branch checked out with its state
    // file still present — exactly what a killed process would leave behind.
    git(root, ['checkout', '-b', 'vinaya/demo-break-crashed-1'])
    const gitDir = git(root, ['rev-parse', '--git-dir'])
    const stateAbs = gitDir.startsWith('/') ? gitDir : join(root, gitDir)
    writeFileSync(
      join(stateAbs, 'vinaya-demo-state.json'),
      JSON.stringify({ originalBranch: 'main', demoBranch: 'vinaya/demo-break-crashed-1' }),
      'utf-8'
    )

    let code = -1
    const out = await captureStdout(async () => {
      code = await runDemoBreak(root, [])
    })
    expect(code, out).toBe(0)
    expect(out).toContain('Found a leftover demo branch from a previous run')

    expect(git(root, ['rev-parse', '--abbrev-ref', 'HEAD'])).toBe('main')
    expect(git(root, ['status', '--porcelain'])).toBe('')
    const remaining = git(root, ['for-each-ref', '--format=%(refname:short)', 'refs/heads/vinaya/demo-break-*'])
    expect(remaining).toBe('')
    expect(existsSync(join(stateAbs, 'vinaya-demo-state.json'))).toBe(false)
  }, 15_000)

  // F1 regression (security review HIGH, PR #713): a kill mid-demo leaves the
  // fixture STAGED but uncommitted on the demo branch — the exact window
  // between "stage" and "commit refused, guided fix pending". The old
  // recovery path did `git checkout <originalBranch>` with no `reset`/`clean`
  // first, and plain git carries a staged addition across a checkout — so the
  // fixture would land staged on the user's REAL original branch. This test
  // reproduces that exact window and asserts genuinely no residue survives,
  // not just that the branch name matches.
  it('recovers from a crash mid-demo (staged, uncommitted fixture on the demo branch) leaving the original branch genuinely clean', async () => {
    const beforeHead = git(root, ['rev-parse', 'HEAD'])

    // A real branch that happens to share the reserved prefix, created before
    // this "crash" and NOT part of this run's own state — proves recovery
    // never sweeps by prefix, only ever deletes the one branch it recorded.
    git(root, ['branch', 'vinaya/demo-break-not-mine'])

    // Simulate the crash window: on the demo branch, with the fixture staged
    // (git add'd) but never committed — exactly what `runDemoBreak` leaves on
    // disk between staging and the first (deliberately-refused) commit.
    git(root, ['checkout', '-b', 'vinaya/demo-break-crashed-2'])
    writeFileSync(join(root, '.vinaya-demo-brief.md'), 'incomplete fixture, never committed\n')
    git(root, ['add', '.vinaya-demo-brief.md'])
    expect(git(root, ['status', '--porcelain'])).toContain('A  .vinaya-demo-brief.md')

    const gitDir = git(root, ['rev-parse', '--git-dir'])
    const stateAbs = gitDir.startsWith('/') ? gitDir : join(root, gitDir)
    writeFileSync(
      join(stateAbs, 'vinaya-demo-state.json'),
      JSON.stringify({ originalBranch: 'main', demoBranch: 'vinaya/demo-break-crashed-2' }),
      'utf-8'
    )

    let code = -1
    const out = await captureStdout(async () => {
      code = await runDemoBreak(root, [])
    })
    expect(code, out).toBe(0)

    // Back on main, genuinely clean — not just the right branch name, but no
    // staged, modified, or untracked residue of any kind, and the fixture
    // file itself does not exist there at all.
    expect(git(root, ['rev-parse', '--abbrev-ref', 'HEAD'])).toBe('main')
    expect(git(root, ['status', '--porcelain'])).toBe('')
    expect(git(root, ['diff', '--cached', '--name-only'])).toBe('')
    expect(git(root, ['ls-files', '.vinaya-demo-brief.md'])).toBe('')
    expect(git(root, ['rev-parse', 'HEAD'])).toBe(beforeHead) // no stray commit landed on main either

    // Only the crashed run's own recorded branch was deleted — the unrelated
    // pre-existing branch sharing the prefix survives untouched.
    expect(() => git(root, ['rev-parse', '--verify', 'refs/heads/vinaya/demo-break-crashed-2'])).toThrow()
    expect(git(root, ['rev-parse', '--verify', 'refs/heads/vinaya/demo-break-not-mine'])).toMatch(/^[0-9a-f]{40}$/)

    // cleanup for subsequent assertions/afterEach
    git(root, ['branch', '-D', 'vinaya/demo-break-not-mine'])
  }, 15_000)
})
