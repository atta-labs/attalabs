import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'
import type { CheckSpec } from '../../src/checks/contract'
import { runChecks } from '../../src/checks/runner'

const FIXTURES = join(import.meta.dir, '..', 'fixtures', 'checks')
const PASSING = join(FIXTURES, 'passing-check.ts')
const FAILING = join(FIXTURES, 'failing-check.ts')
const MALFORMED = join(FIXTURES, 'malformed-check.ts')
const SLEEPER = join(FIXTURES, 'sleeper.ts')
const STUBBORN_SLEEPER = join(FIXTURES, 'stubborn-sleeper.ts')

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
})
