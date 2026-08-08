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
  /**
   * Caller environment used both for the pre-spawn required-env check and
   * `buildCheckEnv`'s construction. Defaults to `process.env` — overridable
   * so tests can assert against a synthetic environment instead of the real
   * one the test process happens to be running under.
   */
  callerEnv?: NodeJS.ProcessEnv
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
 * Every `killTree` currently in flight. `detached: true` below (needed so
 * the TIMEOUT path can reach a check's whole process tree) has a side
 * effect: it also removes each check from the terminal's own foreground
 * process group, so a terminal Ctrl+C (SIGINT) no longer reaches them at
 * all — without this registry, the CLI parent would die immediately
 * (Node's default SIGINT disposition, no handler installed) and orphan
 * every in-flight check exactly like the bug this whole file exists to
 * close, just reachable via interrupt instead of timeout.
 */
const activeKillers = new Set<(signal: NodeJS.Signals) => void>()
let signalForwardingInstalled = false

/**
 * Installed once per process (guarded, so repeated `runChecks` calls in a
 * long-lived host — or in this file's own test suite — never pile up
 * duplicate listeners). On SIGINT/SIGTERM: SIGTERM every active check's
 * group, grace period, SIGKILL whatever's still alive, then exit with the
 * conventional 128+signal code — mirroring the per-check escalation below
 * at the whole-CLI level.
 */
function installSignalForwarding(): void {
  if (signalForwardingInstalled) return
  signalForwardingInstalled = true
  const forward = (_signal: NodeJS.Signals, exitCode: number): void => {
    for (const kill of activeKillers) kill('SIGTERM')
    setTimeout(() => {
      for (const kill of activeKillers) kill('SIGKILL')
      process.exit(exitCode)
    }, KILL_GRACE_MS)
  }
  process.on('SIGINT', () => forward('SIGINT', 130))
  process.on('SIGTERM', () => forward('SIGTERM', 143))
}

/**
 * The fixed baseline every constructed env starts from — always forwarded
 * from the caller's env when present, and never removed by a declared
 * entry (an entry may only override a baseline key's VALUE).
 */
const ENV_BASELINE_KEYS = ['PATH', 'LANG', 'HOME', 'HTTPS_PROXY', 'HTTP_PROXY', 'NO_PROXY', 'TMPDIR'] as const

/**
 * Builds the env object a check's child process actually receives —
 * `runOne` below passes this as `spawn()`'s `env` option, the spawn default
 * since the flip (task 3, #776). Exported and unit-tested independently of
 * the spawn path itself.
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

/**
 * Pre-spawn required-env check, run before a check's process ever exists. A
 * `true` declaration absent from `callerEnv`, or an `anyOf` group with no
 * member set, synthesizes a `CheckError` — same shape as the
 * missing-executable error below, since both are "the check could not run
 * at all" outcomes. `{ optional: true }` and a literal string never
 * synthesize: optional-by-declaration means absence is tolerated by
 * contract, and a literal never depends on the caller's environment.
 */
function missingEnvErrors(spec: CheckSpec, callerEnv: NodeJS.ProcessEnv): CheckError[] {
  if (!spec.env) return []
  const errors: CheckError[] = []
  for (const [key, decl] of Object.entries(spec.env)) {
    if (decl === true) {
      if (callerEnv[key] === undefined) {
        errors.push({
          schema: CHECK_SCHEMA_VERSION,
          check: spec.name,
          severity: 'error',
          message: `Could not run check "${spec.name}": required environment variable \`${key}\` is not set.`,
          agent_recovery_prompt: `Set \`${key}\` in the environment before re-running \`vinaya check ${spec.name}\`, or relax its declaration to \`{ optional: true }\` in its \`env\` registration if the check can tolerate absence.`
        })
      }
    } else if (typeof decl === 'object' && decl !== null && 'anyOf' in decl) {
      const satisfied = decl.anyOf.some((member) => callerEnv[member] !== undefined)
      if (!satisfied) {
        errors.push({
          schema: CHECK_SCHEMA_VERSION,
          check: spec.name,
          severity: 'error',
          message: `Could not run check "${spec.name}": none of its required environment variables (${decl.anyOf.join(', ')}) are set.`,
          agent_recovery_prompt: `Set one of ${decl.anyOf.join(', ')} in the environment before re-running \`vinaya check ${spec.name}\`.`
        })
      }
    }
  }
  return errors
}

async function runOne(spec: CheckSpec, timeoutMs: number, callerEnv: NodeJS.ProcessEnv): Promise<CheckOutcome> {
  const start = performance.now()

  const envErrors = missingEnvErrors(spec, callerEnv)
  if (envErrors.length > 0) {
    return {
      name: spec.name,
      status: 'error',
      exitCode: null,
      errors: envErrors,
      durationMs: performance.now() - start
    }
  }

  // Same `node:child_process` shape as `spawnDev` in src/commands/studio.ts.
  // `env` is the constructed baseline+allowlist object (`buildCheckEnv`),
  // the spawn default since the flip (task 3, #776) — the child no longer
  // inherits the full parent environment. `detached: true` puts the child
  // in its OWN process group (pid becomes the group's pgid on POSIX) so the
  // timeout handler below can kill the whole tree, not just this direct
  // child.
  const proc = spawn(spec.run, spec.args ?? [], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
    env: buildCheckEnv(spec.env, callerEnv)
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

  installSignalForwarding()
  activeKillers.add(killTree)

  /**
   * True once the child's own PID is confirmed gone — but a process GROUP
   * can outlive its own leader (a grandchild the check spawned before
   * dying). `process.kill(-pid, 0)` sends no real signal, it only probes
   * whether the group still has a live member; ESRCH means it doesn't.
   */
  function groupStillAlive(pid: number): boolean {
    try {
      process.kill(-pid, 0)
      return true
    } catch {
      return false
    }
  }

  let timedOut = false
  // Resolves once the escalation decision is actually made (grace period
  // elapsed, group-liveness probed, SIGKILL sent if still needed) — awaited
  // below before `runOne` returns, so the caller (and therefore the CLI
  // process, which exits right after `runChecks` resolves) cannot exit out
  // from under a still-pending escalation. A bare `setTimeout` with no
  // await on it was the earlier bug's other half: the direct child's own
  // 'close' let `runOne` return, and the CLI exited, before the scheduled
  // SIGKILL ever got to fire — the escalation existed but nothing waited
  // for it.
  let escalationDone: Promise<void> = Promise.resolve()
  // Lets the post-exitCode fast path (below) skip the rest of the grace
  // period once it can already SEE the whole group is dead, instead of
  // blocking every timed-out check for a full `KILL_GRACE_MS` regardless —
  // the common case (nothing traps SIGTERM, direct child and every
  // grandchild all die on the first group-wide signal).
  let cancelEscalation: (() => void) | undefined
  const timer = setTimeout(() => {
    timedOut = true
    // SIGTERM first; a check that traps/ignores it would otherwise run
    // forever past its declared timeout — escalate to SIGKILL after a
    // grace period so "the runner enforces the timeout" is actually true.
    killTree('SIGTERM')
    escalationDone = new Promise((resolve) => {
      // NOT cancelled merely because the DIRECT child's own 'close' fires
      // (a group-wide SIGTERM commonly kills the direct child fast, well
      // inside this grace period, while a grandchild that traps SIGTERM is
      // still alive) — the group-liveness probe is the actual cancellation
      // condition, applied by the caller via `cancelEscalation` once it can
      // confirm the group's really gone. Gating on "direct child closed"
      // alone (the previous shape) left a SIGTERM-trapping grandchild
      // unreaped even though its group DID receive the escalation window.
      const graceTimer = setTimeout(() => {
        const pid = proc.pid
        // Only signal if the group still has a live member. Sending
        // SIGKILL to a group that has already fully exited risks hitting
        // an OS-recycled, unrelated pgid instead — the group-liveness
        // probe is the guard against that, not a correctness guarantee
        // against every possible recycling race (POSIX gives no atomic
        // "is this still MY group" check), but it closes the window from
        // KILL_GRACE_MS down to this callback's own execution.
        if (pid !== undefined && groupStillAlive(pid)) killTree('SIGKILL')
        resolve()
      }, KILL_GRACE_MS)
      cancelEscalation = () => {
        clearTimeout(graceTimer)
        resolve()
      }
    })
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
  if (timedOut) {
    // Fast path: the direct child's own close/error just fired — if the
    // WHOLE group is already confirmed dead, skip the rest of the grace
    // period instead of blocking this check for a full `KILL_GRACE_MS` for
    // nothing. If anything in the group is still alive (a SIGTERM-trapping
    // grandchild), leave the already-scheduled grace timer to run to its
    // full duration — `escalationDone` below then blocks on ITS resolution.
    const pid = proc.pid
    if (pid === undefined || !groupStillAlive(pid)) cancelEscalation?.()
    // Blocks until the escalation decision is actually made, not just
    // scheduled — see the comment on `escalationDone` above.
    await escalationDone
  }
  activeKillers.delete(killTree)
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
 * at that either. The SIGKILL escalation is awaited (`escalationDone`), not
 * fire-and-forget: `runOne` does not return until the grace period has
 * elapsed AND a group-liveness probe (`process.kill(-pid, 0)`) has run —
 * cancelling it merely because the DIRECT child's own `'close'` fired left a
 * SIGTERM-trapping grandchild unreaped, and not awaiting it at all let the
 * CLI exit (right after `runChecks` resolves) before the scheduled SIGKILL
 * ever got to fire. `detached: true`'s other side effect — removing every
 * check from the terminal's foreground process group, so Ctrl+C no longer
 * reaches them — is closed by `installSignalForwarding`: every in-flight
 * check's `killTree` is registered in `activeKillers`, and a SIGINT/SIGTERM
 * to the CLI itself forwards to all of them before the CLI exits.
 *
 * Env allowlist, live since the flip (task 3, #776): a spawned check's
 * child process sees only the fixed baseline plus its own declared `env`
 * keys (`buildCheckEnv`), never the full parent environment. A `true` or
 * unsatisfied `anyOf` declaration missing from the caller's environment
 * synthesizes a `CheckError` and the check never spawns at all
 * (`missingEnvErrors`, above) — the contract's no-privileged-API invariant
 * extended to the check's own process environment, not just its spawn path.
 * The skip decision above (`shouldSkip`) runs before any of this: a
 * `scope: 'diff'` check skipped by `--diff-only` never reaches `runOne`, so
 * it can never fail over an env var it was never going to read.
 */
export async function runChecks(specs: CheckSpec[], opts: RunOptions): Promise<CheckOutcome[]> {
  const callerEnv = opts.callerEnv ?? process.env
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
      results[idx] = await runOne(spec, spec.timeoutMs ?? opts.defaultTimeoutMs, callerEnv)
    }
  }

  const workerCount = Math.max(1, Math.min(opts.parallel, toRun.length))
  await Promise.all(Array.from({ length: workerCount }, worker))

  return results
}
