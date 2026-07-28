import { spawn } from 'node:child_process'
import { cpus } from 'node:os'
import { globToRegex } from '@atta/aeg-core'
import { CHECK_SCHEMA_VERSION, type CheckError, type CheckOutcome, type CheckSpec, type CheckStatus } from './contract'

export type RunOptions = {
  /** Concurrency cap; excess checks queue. */
  parallel: number
  /** ring-1 default is diff-scoped. */
  diffOnly: boolean
  /** null = full scope (no skip logic applies, regardless of `diffOnly`). */
  changedFiles: string[] | null
  defaultTimeoutMs: number
}

/** A sane cpu-derived default — callers may override via `--parallel`. */
export function defaultParallelism(): number {
  return Math.max(1, cpus().length)
}

function isCheckError(value: unknown): value is CheckError {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    v.schema === CHECK_SCHEMA_VERSION &&
    typeof v.check === 'string' &&
    (v.severity === 'error' || v.severity === 'warning') &&
    typeof v.message === 'string' &&
    typeof v.agent_recovery_prompt === 'string'
  )
}

/**
 * A `scope: 'diff'` check is skipped when `--diff-only` is active, changed
 * files are known, the check declares `include` globs, and none match. A
 * check with no `include` globs declares no scoping preference and is never
 * skipped on that basis alone. `scope: 'full'` checks always run.
 */
function shouldSkip(spec: CheckSpec, opts: RunOptions): boolean {
  if (spec.scope !== 'diff') return false
  if (!opts.diffOnly) return false
  if (opts.changedFiles === null) return false
  if (!spec.include || spec.include.length === 0) return false
  const regexes = spec.include.map(globToRegex)
  return !opts.changedFiles.some((f) => regexes.some((re) => re.test(f)))
}

/** Grace period between SIGTERM and SIGKILL for a timed-out check. */
const KILL_GRACE_MS = 2000

async function runOne(spec: CheckSpec, timeoutMs: number): Promise<CheckOutcome> {
  const start = performance.now()
  // Same `node:child_process` shape as `spawnDev` in src/commands/studio.ts —
  // no `env` override, so the child inherits the full parent environment.
  const proc = spawn(spec.run, spec.args ?? [], {
    stdio: ['ignore', 'pipe', 'pipe']
  })

  let timedOut = false
  let killTimer: ReturnType<typeof setTimeout> | undefined
  const timer = setTimeout(() => {
    timedOut = true
    // SIGTERM first; a check that traps/ignores it would otherwise run
    // forever past its declared timeout — escalate to SIGKILL after a
    // grace period so "the runner enforces the timeout" is actually true.
    proc.kill('SIGTERM')
    killTimer = setTimeout(() => proc.kill('SIGKILL'), KILL_GRACE_MS)
  }, timeoutMs)

  let stderrText = ''
  proc.stderr.setEncoding('utf-8')
  proc.stderr.on('data', (chunk: string) => {
    stderrText += chunk
  })
  // Drain stdout so the child never blocks on a full pipe buffer; the
  // runner never prints stdout (Part 6's command owns human output).
  proc.stdout.resume()

  const exitCode = await new Promise<number | null>((resolve) => {
    // 'close', not 'exit' — it fires after the stdio pipes have drained, so
    // stderr is complete before parsing.
    proc.on('close', (code) => resolve(code))
    // A spawn failure (e.g. the executable does not exist) must surface as a
    // loud `status: 'error'` outcome, never an unhandled 'error' crash.
    proc.on('error', () => resolve(null))
  })
  clearTimeout(timer)
  clearTimeout(killTimer)
  const durationMs = performance.now() - start

  if (timedOut) {
    return { name: spec.name, status: 'timeout', exitCode: null, errors: [], durationMs }
  }

  const lines = stderrText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const errors: CheckError[] = []
  let malformed = false
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line)
      if (isCheckError(parsed)) {
        errors.push(parsed)
      } else {
        malformed = true
      }
    } catch {
      malformed = true
    }
  }

  // A check that emits garbage must be loud (`status: 'error'`), never a
  // silent pass — regardless of its own exit code.
  let status: CheckStatus
  if (malformed) {
    status = 'error'
  } else if (exitCode === 0) {
    status = 'pass'
  } else if (exitCode === 1) {
    status = 'fail'
  } else {
    status = 'error'
  }

  return { name: spec.name, status, exitCode, errors, durationMs }
}

/**
 * Runs every spec through exactly one spawn path — this IS the no-privileged-
 * API invariant. `runChecks` never branches on whether a
 * `CheckSpec` came from the built-in registry or from `vinaya.config.json`;
 * see `tests/checks/no-privileged-api.test.ts` for the mechanical proof.
 *
 * The runner enforces the per-check timeout itself (spawn, SIGTERM, escalate
 * to SIGKILL after `KILL_GRACE_MS`) — a check trusted to time itself out
 * cannot be trusted at all.
 *
 * Known hardening gaps, not addressed by this task (documented rather than
 * silently ignored): the spawn inherits the full parent environment — the
 * contract's "no-network-by-default" rule is convention-only, nothing here
 * sandboxes or scrubs a check's network access or secret visibility; and the
 * timeout kill targets only the direct child, not a process group/tree, so a
 * check that itself shells out to a further subprocess can leave that
 * grandchild running past the kill.
 */
export async function runChecks(specs: CheckSpec[], opts: RunOptions): Promise<CheckOutcome[]> {
  const results: CheckOutcome[] = new Array(specs.length)
  const toRun: number[] = []

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i] as CheckSpec
    if (shouldSkip(spec, opts)) {
      results[i] = { name: spec.name, status: 'skipped', exitCode: null, errors: [], durationMs: 0 }
    } else {
      toRun.push(i)
    }
  }

  let cursor = 0
  const worker = async (): Promise<void> => {
    while (cursor < toRun.length) {
      const idx = toRun[cursor] as number
      cursor += 1
      const spec = specs[idx] as CheckSpec
      results[idx] = await runOne(spec, spec.timeoutMs ?? opts.defaultTimeoutMs)
    }
  }

  const workerCount = Math.max(1, Math.min(opts.parallel, toRun.length))
  await Promise.all(Array.from({ length: workerCount }, worker))

  return results
}
