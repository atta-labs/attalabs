import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DOC_OWNERS_PATH } from '@atta/aeg-core'
import type { DoctorDeps } from '../src/commands/doctor.js'
import type { InitDeps } from '../src/commands/init.js'
import type { QuickstartDeps } from '../src/commands/quickstart.js'
import { runQuickstart } from '../src/commands/quickstart.js'
import { PROJECTS_REGISTRY_PATH } from '../src/lib/registry-write.js'
import type { LabelGateway } from '../src/lib/ops.js'

// The real CLI source, invoked directly by `bun` — same technique
// `demo.test.ts` uses, needed here because `demo break` (reached when the
// fixture accepts that prompt) shells to the REAL installed git hook, and
// `runInit`'s own hook body always embeds a real `npx --yes @attalabs/
// vinaya@<version>` invocation (not test-controllable via any dep). Swapping
// that hook's content for one that calls this workspace's own source
// directly keeps the test fast and network-free.
const INDEX_TS = fileURLToPath(new URL('../src/index.ts', import.meta.url))

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
}

function makeHookLocal(root: string): void {
  const body = `#!/usr/bin/env sh\nbun ${INDEX_TS} check --all --diff-only || exit 1\n`
  writeFileSync(join(root, '.git/hooks/pre-commit'), body, { mode: 0o755 })
}

function initFixture(): string {
  const root = join(tmpdir(), `vinaya-quickstart-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(root, { recursive: true })
  git(root, ['init', '-q', '-b', 'main'])
  git(root, ['config', 'user.email', 'test@example.com'])
  git(root, ['config', 'user.name', 'Test'])
  writeFileSync(join(root, 'README.md'), '# fixture\n')
  // Doc pointers this file's own tests bind — quickstart now refuses a
  // pointer that doesn't exist on disk (review finding: a typo'd pointer was
  // previously written straight into .vinaya/doc-owners with no check), so
  // the fixture must carry real files at the paths the tests actually bind.
  mkdirSync(join(root, 'apps/foo/specs'), { recursive: true })
  writeFileSync(join(root, 'apps/foo/specs/foo.md'), '# foo\n')
  mkdirSync(join(root, 'apps/bar/specs'), { recursive: true })
  writeFileSync(join(root, 'apps/bar/specs/bar.md'), '# bar\n')
  git(root, ['add', '-A'])
  git(root, ['commit', '-q', '-m', 'Chore: initial commit'])
  return root
}

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

/**
 * A shared, ordered answer queue drives both `initDeps.confirm` (what
 * `runInit`/`runInitProduct` call internally) and quickstart's own
 * `confirm`/`ask` — exactly one script of canned answers per test, in the
 * same order a real interactive session would receive them. Never touches
 * real stdin: `lib/prompt.ts` is not exercised at all by this file.
 */
function makeDeps(
  root: string,
  answers: string[]
): { deps: QuickstartDeps; questions: string[]; closeStdinCalls: () => number } {
  const queue = [...answers]
  const questions: string[] = []
  let closeStdinCalls = 0
  const next = (): string => {
    const v = queue.shift()
    if (v === undefined) throw new Error(`makeDeps: ran out of canned answers (asked ${questions.length} questions)`)
    return v
  }
  const labels: LabelGateway = {
    async exists() {
      return false
    },
    async create() {}
  }
  const initDeps: InitDeps = {
    detectRepo: async () => ({ repoRoot: root, owner: 'acme', repo: 'widget' }),
    checkGhAuth: async () => true,
    labelGateway: () => labels,
    hookDirFor: () => '.git/hooks',
    customHooksPath: async () => null,
    confirm: async (q) => {
      questions.push(q)
      return next().toLowerCase().startsWith('y')
    }
  }
  const doctorDeps: DoctorDeps = {
    detectRepo: async () => ({ repoRoot: root, owner: 'acme', repo: 'widget' }),
    ghAuthStatus: async () => ({ authenticated: true, detail: 'ok' }),
    branchProtectionConfigured: async () => null,
    hookDirFor: () => '.git/hooks',
    nodeVersion: () => 'v99.0.0',
    bunVersion: () => 'test-bun',
    packageVersion: () => '0.1.0-test'
  }
  let hookSwapped = false
  const deps: QuickstartDeps = {
    detectRepo: async () => ({ repoRoot: root, owner: 'acme', repo: 'widget' }),
    initDeps,
    doctorDeps,
    confirm: async (q, defaultYes) => {
      questions.push(q)
      // `runInit` (already run by the time quickstart's OWN confirm is first
      // called) installs the REAL hook — a real `npx --yes @attalabs/vinaya@…`
      // invocation. `commitInstall()` runs before the demo-break prompt and
      // triggers that same hook on its own `git commit`, so the swap must
      // happen on quickstart's first confirm call (right after `runInit`
      // returns), not gated on the demo-break question text — that gate
      // fired too late, after `commitInstall()` had already hit the real
      // hook and failed in this network-free sandbox.
      if (!hookSwapped) {
        makeHookLocal(root)
        hookSwapped = true
      }
      const raw = next()
      if (raw === '') return defaultYes
      return raw.toLowerCase().startsWith('y')
    },
    ask: async (q) => {
      questions.push(q)
      return next()
    },
    closeStdin: () => {
      closeStdinCalls++
    }
  }
  return { deps, questions, closeStdinCalls: () => closeStdinCalls }
}

let root: string

beforeEach(() => {
  root = initFixture()
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('vinaya quickstart', () => {
  it('accept-everything: installs, binds a doc-owner, registers a project, commits, proves the install, and gracefully reports a failed push (no remote)', async () => {
    const { deps, closeStdinCalls } = makeDeps(root, [
      '', // press-enter pause before the diff
      'y', // vinaya init's own confirm
      'y', // bind a doc-owner pair?
      'apps/foo/src/**', // glob
      'apps/foo/specs/foo.md', // pointer
      'n', // bind another? — declined
      'y', // register project?
      'demo', // project name
      '', // project path — empty, default '.'
      'n', // register another? — declined
      'y', // run demo break?
      'y' // push?
    ])

    let rc = -1
    const out = await captureStdout(async () => {
      rc = await runQuickstart([], deps)
    })
    expect(rc, out).toBe(0)

    // init actually installed (hooks + config), not just diffed.
    expect(existsSync(join(root, 'vinaya.config.json'))).toBe(true)
    expect(existsSync(join(root, '.git/hooks/pre-commit'))).toBe(true)

    // doc-owners binding threaded through to the Part 1 writer.
    const docOwners = readFileSync(join(root, DOC_OWNERS_PATH), 'utf-8')
    expect(docOwners).toContain('apps/foo/src/**  apps/foo/specs/foo.md')

    // project registration threaded through to `runInitProduct`/`registry-write.ts`.
    const registry = readFileSync(join(root, PROJECTS_REGISTRY_PATH), 'utf-8')
    expect(registry).toContain('| demo | `.` |')

    // a real commit landed.
    const log = git(root, ['log', '--oneline'])
    expect(log.split('\n').length).toBe(2) // initial commit + install commit
    expect(git(root, ['log', '-1', '--format=%s'])).toBe('Chore: install Vinaya')
    expect(git(root, ['status', '--porcelain'])).toBe('')

    // demo break actually ran (real refusal, real fix, real cleanup).
    expect(out).toContain('✗ Commit refused')
    expect(out).toContain('✓ Commit passed — the fix worked.')
    expect(git(root, ['for-each-ref', '--format=%(refname:short)', 'refs/heads/vinaya/demo-break-*'])).toBe('')

    // the working tree is previewed before the commit lands (review finding, PR
    // #838) — status is captured BEFORE `git add -A` runs, so new files are
    // still untracked (`??`), not staged (`A`).
    expect(out).toContain('Working tree before commit')
    expect(out).toContain('?? vinaya.config.json')

    // doctor ran.
    expect(out).toContain('vinaya doctor')

    // push was attempted and failed gracefully (fixture has no remote) — the
    // command still completes successfully rather than crashing.
    expect(out).toContain('git push failed')

    // next-step hints omit demo break/push since both ran, but the command
    // still finishes cleanly.
    expect(out).toContain('Next steps:')

    expect(closeStdinCalls()).toBe(1)
  }, 30_000)

  it('decline-everything: nothing installed, no commit, no stray artifacts — closeStdin still called exactly once', async () => {
    const { deps, closeStdinCalls } = makeDeps(root, [
      '', // press-enter pause before the diff
      'n', // vinaya init's own confirm — declined
      'n', // bind a doc-owner pair? — declined, no sub-prompts follow
      'n', // register project? — declined, no sub-prompts follow
      'n', // run demo break? — declined
      'n' // push? — declined
    ])

    let rc = -1
    const out = await captureStdout(async () => {
      rc = await runQuickstart([], deps)
    })
    expect(rc, out).toBe(0)

    // nothing vinaya-owned was written.
    expect(existsSync(join(root, 'vinaya.config.json'))).toBe(false)
    expect(existsSync(join(root, '.vinaya'))).toBe(false)
    expect(existsSync(join(root, PROJECTS_REGISTRY_PATH))).toBe(false)

    // the working tree preview still fires even when there's nothing to show.
    expect(out).toContain('Working tree before commit')
    expect(out).toContain('(clean)')

    // the commit step is NOT gated by a prompt — it always runs — but since
    // nothing changed, it must no-op rather than create an empty commit.
    expect(out).toContain('Nothing to commit')
    const log = git(root, ['log', '--oneline'])
    expect(log.split('\n').length).toBe(1) // only the original fixture commit
    expect(git(root, ['status', '--porcelain'])).toBe('')

    // demo break never ran — no branch, no artifact, and the skip surfaces
    // in the next-step hints.
    expect(out).not.toContain('✗ Commit refused')
    expect(git(root, ['for-each-ref', '--format=%(refname:short)', 'refs/heads/vinaya/demo-break-*'])).toBe('')
    expect(out).toContain('vinaya demo break')

    // push never ran, and its own hint survives.
    expect(out).not.toContain('git push failed')
    expect(out).toContain('  git push')

    expect(closeStdinCalls()).toBe(1)
  })

  it('declining just the doc-owner prompt skips only that step, keeping project registration', async () => {
    const { deps } = makeDeps(root, [
      '', // press-enter pause before the diff
      'y', // init
      'n', // bind doc-owner — declined
      'y', // register project
      'demo',
      '.',
      'n', // register another? — declined
      'n', // demo break — declined, keep the test fast
      'n' // push — declined
    ])

    let rc = -1
    await captureStdout(async () => {
      rc = await runQuickstart([], deps)
    })
    expect(rc).toBe(0)

    const docOwners = readFileSync(join(root, DOC_OWNERS_PATH), 'utf-8')
    expect(docOwners).not.toContain('apps/foo/src/**')
    expect(existsSync(join(root, PROJECTS_REGISTRY_PATH))).toBe(true)
  }, 15_000)

  it('declining just the project-registration prompt skips only that step, keeping the doc-owner binding', async () => {
    const { deps } = makeDeps(root, [
      '', // press-enter pause before the diff
      'y', // init
      'y', // bind doc-owner
      'apps/bar/src/**',
      'apps/bar/specs/bar.md',
      'n', // bind another? — declined
      'n', // register project — declined
      'n', // demo break — declined
      'n' // push — declined
    ])

    let rc = -1
    await captureStdout(async () => {
      rc = await runQuickstart([], deps)
    })
    expect(rc).toBe(0)

    const docOwners = readFileSync(join(root, DOC_OWNERS_PATH), 'utf-8')
    expect(docOwners).toContain('apps/bar/src/**  apps/bar/specs/bar.md')
    expect(existsSync(join(root, PROJECTS_REGISTRY_PATH))).toBe(false)
  }, 15_000)

  it('rejects a project name or path containing whitespace/pipe/newline, offers a retry, and skips cleanly on decline (review finding, PR #838)', async () => {
    // console.error goes to stderr, which captureStdout does not capture —
    // absence of the registry file is the observable proof the guard fired
    // and runInitProduct was never called, matching this file's own style
    // for the other declined-step tests.
    const { deps: depsBadName } = makeDeps(root, [
      '', // press-enter pause before the diff
      'y', // init
      'n', // bind doc-owner — declined
      'y', // register project
      'bad name', // whitespace in name — invalid
      '.',
      'n', // "Try again?" — declined
      'n', // demo break — declined
      'n' // push — declined
    ])
    let rc = -1
    await captureStdout(async () => {
      rc = await runQuickstart([], depsBadName)
    })
    expect(rc).toBe(0)
    expect(existsSync(join(root, PROJECTS_REGISTRY_PATH))).toBe(false)

    const root2 = initFixture() // separate fixture for the second sub-case
    try {
      const { deps: depsBadPath } = makeDeps(root2, [
        '', // press-enter pause before the diff
        'y', // init
        'n', // bind doc-owner — declined
        'y', // register project
        'demo',
        'apps/foo|bar', // pipe in path — invalid
        'n', // "Try again?" — declined
        'n', // demo break — declined
        'n' // push — declined
      ])
      let rc2 = -1
      await captureStdout(async () => {
        rc2 = await runQuickstart([], depsBadPath)
      })
      expect(rc2).toBe(0)
      expect(existsSync(join(root2, PROJECTS_REGISTRY_PATH))).toBe(false)
    } finally {
      rmSync(root2, { recursive: true, force: true })
    }
  }, 15_000)

  it('retries the doc-owner bind after a bad pointer and succeeds on the second attempt', async () => {
    const { deps } = makeDeps(root, [
      '', // press-enter pause before the diff
      'y', // init
      'y', // bind doc-owner
      'apps/foo/src/**', // glob (valid)
      'does-not-exist.md', // pointer — no such file, first attempt fails
      'y', // "Try again?" — accepted
      'apps/foo/src/**', // glob, retried
      'apps/foo/specs/foo.md', // pointer — a real file this time
      'n', // bind another? — declined
      'n', // register project — declined
      'n', // demo break — declined
      'n' // push — declined
    ])

    let rc = -1
    const out = await captureStdout(async () => {
      rc = await runQuickstart([], deps)
    })
    expect(rc, out).toBe(0)

    const docOwners = readFileSync(join(root, DOC_OWNERS_PATH), 'utf-8')
    expect(docOwners).toContain('apps/foo/src/**  apps/foo/specs/foo.md')
  }, 15_000)

  it('binds two doc-owner pairs and registers two projects in one run (review finding, live: was one-shot only)', async () => {
    const { deps } = makeDeps(root, [
      '', // press-enter pause before the diff
      'y', // init
      'y', // bind doc-owner
      'apps/foo/src/**',
      'apps/foo/specs/foo.md',
      'y', // bind another? — accepted
      'apps/bar/src/**',
      'apps/bar/specs/bar.md',
      'n', // bind another? — declined
      'y', // register project
      'foo',
      'apps/foo',
      'y', // register another? — accepted
      'bar',
      'apps/bar',
      'n', // register another? — declined
      'n', // demo break — declined, keep the test fast
      'n' // push — declined
    ])

    let rc = -1
    const out = await captureStdout(async () => {
      rc = await runQuickstart([], deps)
    })
    expect(rc, out).toBe(0)

    const docOwners = readFileSync(join(root, DOC_OWNERS_PATH), 'utf-8')
    expect(docOwners).toContain('apps/foo/src/**  apps/foo/specs/foo.md')
    expect(docOwners).toContain('apps/bar/src/**  apps/bar/specs/bar.md')

    const registry = readFileSync(join(root, PROJECTS_REGISTRY_PATH), 'utf-8')
    expect(registry).toContain('| foo |')
    expect(registry).toContain('| bar |')
  }, 15_000)

  it('closeStdin() is called exactly once when `vinaya init` itself fails', async () => {
    // One answer now: the press-enter pause fires before quickstart even
    // calls runInit, so it's no longer prompt-free — the failure it forces
    // still happens with no FURTHER prompt.
    const { deps, closeStdinCalls } = makeDeps(root, [''])
    deps.initDeps.detectRepo = async () => null // forces runInit to fail fast with rc=1

    let rc = -1
    await captureStdout(async () => {
      rc = await runQuickstart([], deps)
    })
    expect(rc).toBe(1)
    expect(closeStdinCalls()).toBe(1)
  })

  it('closeStdin() is called even when a step throws mid-flow', async () => {
    const { deps, closeStdinCalls } = makeDeps(root, ['', 'y', 'y', 'apps/foo/src/**'])
    // the pointer prompt throws instead of answering — simulates an
    // unexpected failure partway through the flow.
    const realAsk = deps.ask
    deps.ask = async (q: string) => {
      if (q.startsWith('Doc pointer')) throw new Error('boom')
      return realAsk(q)
    }

    let threw = false
    await captureStdout(async () => {
      try {
        await runQuickstart([], deps)
      } catch {
        threw = true
      }
    })
    expect(threw).toBe(true)
    expect(closeStdinCalls()).toBe(1)
  })

  it('returns 1 and never opens a prompt when not run inside a git repository', async () => {
    const { deps, closeStdinCalls, questions } = makeDeps(root, [])
    deps.detectRepo = async () => null

    let rc = -1
    await captureStdout(async () => {
      rc = await runQuickstart([], deps)
    })
    expect(rc).toBe(1)
    expect(questions).toEqual([])
    expect(closeStdinCalls()).toBe(0)
  })
})
