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

/**
 * The fixed baseline every constructed env starts from — always forwarded
 * from the caller's env when present, and never removed by a declared
 * entry (an entry may only override a baseline key's VALUE).
 */
const ENV_BASELINE_KEYS = ['PATH', 'LANG', 'HOME', 'HTTPS_PROXY', 'HTTP_PROXY', 'NO_PROXY', 'TMPDIR'] as const

/**
 * Builds the env object a check's child process WOULD receive once
 * allowlist construction is wired as the spawn default — a later minor
 * (this task ships the warn release only; `runOne` below still calls
 * `spawn()` with no `env` override, so the child inherits the full parent
 * environment). This function is exported and unit-tested ahead of that
 * flip so the construction logic is proven correct before it goes live.
 *
 * Expansion, never spread: the baseline keys above are forwarded from
 * `callerEnv` when set, then each declared entry in `spec.env` layers on
 * top, per its own form:
 *   - `true` / `{ optional: true }` — forward `callerEnv[key]` if set;
 *     both forms behave identically here (the difference between them is a
 *     documentation-time contract — "this check hard-needs it" vs "this
 *     check tolerates its absence" — not a construction-time one).
 *   - `{ anyOf: [...] }` — for each member, forward `callerEnv[member]`
 *     under ITS OWN name if the caller has it set — never renamed to `key`.
 *   - a literal string — set `key` to that exact string, ignoring
 *     `callerEnv` entirely (never interpolated: `"$PATH"` is four literal
 *     characters, not an expansion).
 */
export function buildCheckEnv(
  env: CheckSpec['env'],
  callerEnv: NodeJS.ProcessEnv = process.env
): Record<string, string> {
  const out: Record<string, string> = {}

  for (const key of ENV_BASELINE_KEYS) {
    const value = callerEnv[key]
    if (value !== undefined) out[key] = value
  }

  if (!env) return out

  for (const [key, decl] of Object.entries(env)) {
    if (decl === true || (typeof decl === 'object' && 'optional' in decl)) {
      const value = callerEnv[key]
      if (value !== undefined) out[key] = value
    } else if (typeof decl === 'object' && 'anyOf' in decl) {
      for (const member of decl.anyOf) {
        const value = callerEnv[member]
        if (value !== undefined) out[member] = value
      }
    } else if (typeof decl === 'string') {
      out[key] = decl
    }
  }

  return out
}

async function runOne(spec: CheckSpec, timeoutMs: number): Promise<CheckOutcome> {
  const start = performance.now()
  // Same `node:child_process` shape as `spawnDev` in src/commands/studio.ts —
  // no `env` override, so the child inherits the full parent environment
  // (`buildCheckEnv` above is built and tested, but not yet wired here —
  // that flip is a later minor). `detached: true` puts the child in its OWN
  // process group (pid becomes the group's pgid on POSIX) so the timeout
  // handler below can kill the whole tree, not just this direct child.
  const proc = spawn(spec.run, spec.args ?? [], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true
  })

  // Best-effort process-GROUP kill: negative pid targets every process in
  // the child's group, reaching a grandchild the check itself shelled out
  // to (previously survived the timeout entirely — the direct-child-only
  // `proc.kill()` never reached it). Falls back to the single-pid form if
  // the group kill throws (e.g. the group already exited, or a platform
  // where negative-pid signaling isn't supported) — never left as the ONLY
  // attempt, since a thrown group-kill must not mean "gave up."
  function killTree(signal: NodeJS.Signals): void {
    const pid = proc.pid
    if (pid === undefined) return
    try {
      process.kill(-pid, signal)
    } catch {
      try {
        proc.kill(signal)
      } catch {
        // Already gone — nothing left to signal.
      }
    }
  }

  let timedOut = false
  let killTimer: ReturnType<typeof setTimeout> | undefined
  const timer = setTimeout(() => {
    timedOut = true
    // SIGTERM first; a check that traps/ignores it would otherwise run
    // forever past its declared timeout — escalate to SIGKILL after a
    // grace period so "the runner enforces the timeout" is actually true.
    killTree('SIGTERM')
    killTimer = setTimeout(() => killTree('SIGKILL'), KILL_GRACE_MS)
  }, timeoutMs)

  let stderrText = ''
  proc.stderr.setEncoding('utf-8')
  proc.stderr.on('data', (chunk: string) => {
    stderrText += chunk
  })
  // Drain stdout so the child never blocks on a full pipe buffer; the
  // runner never prints stdout (Part 6's command owns human output).
  proc.stdout.resume()

  // Retained so the failure can be reported. Resolving `null` alone tells the
  // caller THAT the spawn failed but never why, which reads identically to a
  // check that exited non-zero in silence.
  let spawnError: Error | undefined
  const exitCode = await new Promise<number | null>((resolve) => {
    // 'close', not 'exit' — it fires after the stdio pipes have drained, so
    // stderr is complete before parsing.
    proc.on('close', (code) => resolve(code))
    // A spawn failure (e.g. the executable does not exist) must surface as a
    // loud `status: 'error'` outcome, never an unhandled 'error' crash.
    proc.on('error', (err: Error) => {
      spawnError = err
      resolve(null)
    })
  })
  clearTimeout(timer)
  clearTimeout(killTimer)
  const durationMs = performance.now() - start

  if (timedOut) {
    return { name: spec.name, status: 'timeout', exitCode: null, errors: [], durationMs }
  }

  // The executable never ran. Synthesize the finding the check itself could
  // not emit — an empty `errors: []` here would leave `--json` consumers with
  // a bare `error` status and nothing to act on.
  if (spawnError) {
    const code = (spawnError as NodeJS.ErrnoException).code
    return {
      name: spec.name,
      status: 'error',
      exitCode: null,
      errors: [
        {
          schema: 1,
          check: spec.name,
          severity: 'error',
          message:
            code === 'ENOENT'
              ? `Could not run check "${spec.name}": executable \`${spec.run}\` was not found on PATH.`
              : `Could not run check "${spec.name}": ${spawnError.message}`,
          agent_recovery_prompt:
            code === 'ENOENT'
              ? `Install \`${spec.run}\` or correct the \`run\` field for check "${spec.name}" in vinaya.config.json, then re-run.`
              : `Inspect the \`run\` and \`args\` fields for check "${spec.name}" in vinaya.config.json, then re-run.`
        }
      ],
      durationMs
    }
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
 * to SIGKILL after `KILL_GRACE_MS`, both targeting the check's whole process
 * GROUP via `detached: true` + negative-pid signaling — closed live, this
 * task) — a check trusted to time itself out cannot be trusted at all, and a
 * check trusted to kill its own children on the way out cannot be trusted
 * at that either.
 *
 * Known hardening gap, not yet addressed (documented rather than silently
 * ignored): the spawn still inherits the full parent environment — the
 * contract's "no-network-by-default" rule is convention-only, nothing here
 * sandboxes or scrubs a check's network access or secret visibility.
 * `CheckSpec['env']` + `buildCheckEnv` above are the allowlist grammar and
 * construction logic for closing this gap, built and tested but not yet
 * wired as the spawn default — this task ships the warn release only
 * (`vinaya check`/`vinaya doctor` warn when a check reads `process.env`
 * with no `env` declaration); a later minor flips `spawn()` to pass
 * `buildCheckEnv(spec.env)` as its `env` option, at which point this
 * comment updates again.
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
