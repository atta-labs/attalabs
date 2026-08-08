import { execSync } from 'node:child_process'
import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'
import type { CheckSpec } from '../../src/checks/contract'
import { buildCheckEnv, runChecks } from '../../src/checks/runner'

const FIXTURES = join(import.meta.dir, '..', 'fixtures', 'checks')
const PASSING = join(FIXTURES, 'passing-check.ts')
const FAILING = join(FIXTURES, 'failing-check.ts')
const MALFORMED = join(FIXTURES, 'malformed-check.ts')
const SLEEPER = join(FIXTURES, 'sleeper.ts')
const STUBBORN_SLEEPER = join(FIXTURES, 'stubborn-sleeper.ts')
const SPAWNS_GRANDCHILD = join(FIXTURES, 'spawns-grandchild.ts')
const SPAWNS_STUBBORN_GRANDCHILD = join(FIXTURES, 'spawns-stubborn-grandchild.ts')
const RUN_AND_HANG = join(FIXTURES, 'run-and-hang.ts')

function fullScope(overrides: Partial<CheckSpec> & Pick<CheckSpec, 'name' | 'run'>): CheckSpec {
  return { scope: 'full', ...overrides }
}

const BASE_OPTS = { parallel: 1, diffOnly: false, changedFiles: null, defaultTimeoutMs: 5000 }

describe('runChecks', () => {
  it('reports pass for a check that exits 0 with no findings', async () => {
    const [outcome] = await runChecks([fullScope({ name: 'passing', run: PASSING })], BASE_OPTS)
    expect(outcome?.status).toBe('pass')
    expect(outcome?.exitCode).toBe(0)
    expect(outcome?.errors).toEqual([])
  })

  it('reports a diagnostic error when the executable does not exist', async () => {
    const [outcome] = await runChecks(
      [fullScope({ name: 'missing-bin', run: join(FIXTURES, 'no-such-executable') })],
      BASE_OPTS
    )
    expect(outcome?.status).toBe('error')
    expect(outcome?.exitCode).toBeNull()
    // The point of the test: a spawn failure must not resolve to `errors: []`,
    // which would leave a --json consumer with a bare status and no cause.
    expect(outcome?.errors).toHaveLength(1)
    expect(outcome?.errors[0]?.message).toContain('was not found on PATH')
    expect(outcome?.errors[0]?.agent_recovery_prompt).toContain('vinaya.config.json')
  })

  it('reports fail and parses the CheckError JSON line for a check that exits 1', async () => {
    const [outcome] = await runChecks([fullScope({ name: 'failing', run: FAILING })], BASE_OPTS)
    expect(outcome?.status).toBe('fail')
    expect(outcome?.exitCode).toBe(1)
    expect(outcome?.errors).toHaveLength(1)
    expect(outcome?.errors[0]?.check).toBe('fixture-failing')
    expect(outcome?.errors[0]?.agent_recovery_prompt).toBeTruthy()
  })

  it('reports error (never a silent pass) when a check emits non-JSON stderr', async () => {
    const [outcome] = await runChecks([fullScope({ name: 'malformed', run: MALFORMED })], BASE_OPTS)
    expect(outcome?.status).toBe('error')
  })

  it('enforces the runner timeout — a slow check is killed and reported as timeout', async () => {
    const start = performance.now()
    const [outcome] = await runChecks(
      [fullScope({ name: 'slow', run: SLEEPER, args: ['10000'], timeoutMs: 500 })],
      BASE_OPTS
    )
    const elapsed = performance.now() - start
    expect(outcome?.status).toBe('timeout')
    expect(outcome?.exitCode).toBeNull()
    expect(elapsed).toBeLessThan(2000)
  })

  it('escalates to SIGKILL when a timed-out check traps/ignores SIGTERM', async () => {
    // stubborn-sleeper.ts ignores SIGTERM entirely — if the runner only ever
    // sent SIGTERM, `proc.exited` would never resolve and this test would
    // hang past bun:test's own timeout. Its completion IS the proof the
    // SIGKILL escalation actually terminates the process.
    const start = performance.now()
    const [outcome] = await runChecks(
      [fullScope({ name: 'stubborn', run: STUBBORN_SLEEPER, args: ['10000'], timeoutMs: 300 })],
      BASE_OPTS
    )
    const elapsed = performance.now() - start
    expect(outcome?.status).toBe('timeout')
    expect(outcome?.exitCode).toBeNull()
    // Bounded by timeoutMs + the runner's SIGKILL grace period + slack.
    expect(elapsed).toBeLessThan(4000)
  }, 10_000)

  it('caps concurrency — 6 checks at 300ms each with parallel=2 take at least ~900ms', async () => {
    const specs = Array.from({ length: 6 }, (_, i) => fullScope({ name: `sleep-${i}`, run: SLEEPER, args: ['300'] }))
    const start = performance.now()
    await runChecks(specs, { ...BASE_OPTS, parallel: 2 })
    const elapsed = performance.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(850)
    expect(elapsed).toBeLessThan(1600)
  })

  it('skips a diff-scoped check under --diff-only when no changed file matches its include globs', async () => {
    const spec = fullScope({ name: 'scoped', run: PASSING, scope: 'diff', include: ['apps/other/**'] })
    const [outcome] = await runChecks([spec], {
      ...BASE_OPTS,
      diffOnly: true,
      changedFiles: ['apps/vinaya/cli/src/index.ts']
    })
    expect(outcome?.status).toBe('skipped')
    expect(outcome?.exitCode).toBeNull()
  })

  it('runs a diff-scoped check under --diff-only when a changed file matches its include globs', async () => {
    const spec = fullScope({ name: 'scoped', run: PASSING, scope: 'diff', include: ['apps/vinaya/**'] })
    const [outcome] = await runChecks([spec], {
      ...BASE_OPTS,
      diffOnly: true,
      changedFiles: ['apps/vinaya/cli/src/index.ts']
    })
    expect(outcome?.status).toBe('pass')
  })

  it('never skips a scope: full check regardless of --diff-only', async () => {
    const spec = fullScope({ name: 'always', run: PASSING, scope: 'full' })
    const [outcome] = await runChecks([spec], { ...BASE_OPTS, diffOnly: true, changedFiles: [] })
    expect(outcome?.status).toBe('pass')
  })

  it("kills a timed-out check's whole process group — a grandchild it spawned does not survive", async () => {
    const [outcome] = await runChecks(
      [fullScope({ name: 'spawns-grandchild', run: SPAWNS_GRANDCHILD, timeoutMs: 1000 })],
      BASE_OPTS
    )
    expect(outcome?.status).toBe('timeout')

    // Grace period (KILL_GRACE_MS) must fully elapse before the grandchild
    // is provably gone — the SIGKILL escalation is async relative to
    // runChecks() resolving on the direct child's own exit.
    await new Promise((resolve) => setTimeout(resolve, 2500))

    const survivors = execSync('ps -eo pid,command | grep "sleep 60" | grep -v grep || true', {
      encoding: 'utf8'
    }).trim()
    expect(survivors).toBe('')
  }, 10_000)

  it("kills a SIGTERM-trapping grandchild even though the DIRECT child's own close fires almost immediately", async () => {
    // The direct child (spawns-stubborn-grandchild.ts) does not trap
    // SIGTERM, so it dies on the group's initial signal well inside
    // KILL_GRACE_MS — its own 'close' event resolving early is exactly the
    // condition that used to cancel the pending SIGKILL escalation. The
    // grandchild it spawned (stubborn-sleeper.ts) DOES trap SIGTERM and can
    // only be reaped by that escalation actually running to completion.
    const [outcome] = await runChecks(
      [fullScope({ name: 'stubborn-grandchild', run: SPAWNS_STUBBORN_GRANDCHILD, timeoutMs: 500 })],
      BASE_OPTS
    )
    expect(outcome?.status).toBe('timeout')

    // No extra sleep needed here (unlike the plain-grandchild test above):
    // `runOne` now awaits the escalation decision before returning, so by
    // the time `outcome` resolves the grandchild is already confirmed dead.
    const survivors = execSync('ps -eo pid,command | grep "stubborn-sleeper" | grep -v grep || true', {
      encoding: 'utf8'
    }).trim()
    expect(survivors).toBe('')
  }, 10_000)

  it('forwards SIGINT to every in-flight check so Ctrl+C does not orphan them', async () => {
    // Runs in a SEPARATE process (not this test process) — sending SIGINT
    // to the test runner itself would kill the whole suite, not exercise
    // the runner's own forwarding path.
    const wrapper = Bun.spawn(['bun', RUN_AND_HANG], { stdio: ['ignore', 'ignore', 'ignore'] })

    // Give the wrapper time to start and spawn its own (detached) check
    // child before interrupting it.
    await new Promise((resolve) => setTimeout(resolve, 500))

    wrapper.kill('SIGINT')
    await wrapper.exited

    // Grace period for the forwarded SIGTERM/SIGKILL escalation to finish
    // reaping the detached check group.
    await new Promise((resolve) => setTimeout(resolve, 2500))

    const survivors = execSync('ps -eo pid,command | grep "fixtures/checks/sleeper.ts" | grep -v grep || true', {
      encoding: 'utf8'
    }).trim()
    expect(survivors).toBe('')
  }, 10_000)
})

describe('buildCheckEnv', () => {
  const BASELINE_CALLER_ENV = {
    PATH: '/usr/bin:/bin',
    LANG: 'en_US.UTF-8',
    HOME: '/home/tester',
    HTTPS_PROXY: 'http://proxy:8080',
    HTTP_PROXY: 'http://proxy:8080',
    NO_PROXY: 'localhost',
    TMPDIR: '/tmp'
  }

  it('always forwards the baseline keys present in the caller env, with no declarations', () => {
    const out = buildCheckEnv(undefined, BASELINE_CALLER_ENV)
    expect(out).toEqual(BASELINE_CALLER_ENV)
  })

  it('never fabricates a baseline key the caller env does not have', () => {
    const out = buildCheckEnv(undefined, { PATH: '/usr/bin' })
    expect(out).toEqual({ PATH: '/usr/bin' })
  })

  it('`true` forwards the caller value for that exact key when set', () => {
    const out = buildCheckEnv({ AEG_REPO: true }, { ...BASELINE_CALLER_ENV, AEG_REPO: 'owner/repo' })
    expect(out.AEG_REPO).toBe('owner/repo')
  })

  it('`true` omits the key entirely when the caller does not have it set', () => {
    const out = buildCheckEnv({ AEG_REPO: true }, BASELINE_CALLER_ENV)
    expect('AEG_REPO' in out).toBe(false)
  })

  it('`{ optional: true }` forwards the caller value when set', () => {
    const out = buildCheckEnv({ PR_BODY: { optional: true } }, { ...BASELINE_CALLER_ENV, PR_BODY: 'body text' })
    expect(out.PR_BODY).toBe('body text')
  })

  it('`{ optional: true }` omits the key when the caller does not have it set — the documented zero-coverage case', () => {
    const out = buildCheckEnv({ PR_BODY: { optional: true } }, BASELINE_CALLER_ENV)
    expect('PR_BODY' in out).toBe(false)
  })

  it('a literal string sets the key to that exact value, ignoring the caller env entirely', () => {
    const out = buildCheckEnv(
      { NODE_ENV: 'production' },
      { ...BASELINE_CALLER_ENV, NODE_ENV: 'this-caller-value-is-ignored' }
    )
    expect(out.NODE_ENV).toBe('production')
  })

  it('a literal string is never interpolated — "$PATH" stays four literal characters', () => {
    const out = buildCheckEnv({ SOME_VAR: '$PATH' }, BASELINE_CALLER_ENV)
    expect(out.SOME_VAR).toBe('$PATH')
  })

  it('anyOf forwards each member under its OWN name when the caller has it set', () => {
    const out = buildCheckEnv(
      { GITHUB_TOKEN: { anyOf: ['GITHUB_TOKEN', 'GH_TOKEN'] } },
      { ...BASELINE_CALLER_ENV, GH_TOKEN: 'gh-token-value' }
    )
    expect(out.GH_TOKEN).toBe('gh-token-value')
    expect('GITHUB_TOKEN' in out).toBe(false)
  })

  it('anyOf forwards every set member simultaneously, not just the first', () => {
    const out = buildCheckEnv(
      { GITHUB_TOKEN: { anyOf: ['GITHUB_TOKEN', 'GH_TOKEN'] } },
      { ...BASELINE_CALLER_ENV, GITHUB_TOKEN: 'a', GH_TOKEN: 'b' }
    )
    expect(out.GITHUB_TOKEN).toBe('a')
    expect(out.GH_TOKEN).toBe('b')
  })

  it('a declared entry OVERRIDES a baseline key value rather than being ignored', () => {
    const out = buildCheckEnv({ PATH: '/custom/bin' }, BASELINE_CALLER_ENV)
    expect(out.PATH).toBe('/custom/bin')
  })

  it('a declared entry never REMOVES a baseline key not itself declared', () => {
    const out = buildCheckEnv({ PATH: '/custom/bin' }, BASELINE_CALLER_ENV)
    expect(out.HOME).toBe(BASELINE_CALLER_ENV.HOME)
    expect(out.LANG).toBe(BASELINE_CALLER_ENV.LANG)
  })
})
