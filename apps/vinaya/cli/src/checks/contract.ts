/**
 * The check error schema is a versioned public surface — plugins
 * will be written against it. Additive evolution ONLY: never remove or
 * retype a field; bump `CHECK_SCHEMA_VERSION` only on a breaking change.
 *
 * Pure contract — no `@atta/aeg-core` import. Both the runner and every
 * check (core or custom) import from here; nothing here depends on them.
 */
export const CHECK_SCHEMA_VERSION = 1

export type CheckSeverity = 'error' | 'warning'

/**
 * One JSON line on stderr, per finding. `message` is the diagnosis (what is
 * wrong); `agent_recovery_prompt` is the corrective INSTRUCTION addressed to
 * the model that will read it (what to do about it) — never a restatement of
 * `message`. exists to engineer the ring-0 self-correction loop; a
 * prompt that merely rephrases the diagnosis fails that purpose.
 */
export type CheckError = {
  schema: typeof CHECK_SCHEMA_VERSION
  check: string
  severity: CheckSeverity
  message: string
  agent_recovery_prompt: string
  file?: string
  line?: number
}

/** every check declares its scope. `diff` checks may be skipped by the runner when no changed file matches `include`. */
export type CheckScope = 'diff' | 'full'

/**
 * A check's spec, whether built-in (registry.ts) or config-registered
 * (vinaya.config.json). Both produce this exact shape — no field either can
 * carry that the other cannot (the no-privileged-API invariant).
 */
export type CheckSpec = {
  name: string
  /** Executable path (or bare command on PATH). Must honor the shebang/exec-bit contract — the runner spawns it directly, never through a shell. */
  run: string
  args?: string[]
  scope: CheckScope
  /** glob SCOPING allowed. Conditionals are never part of this grammar. */
  include?: string[]
  /** Advisory — the RUNNER enforces the actual timeout, never the check itself. */
  timeoutMs?: number
  /**
   * The env allowlist declaration for this check, keyed by variable name.
   * Additive grammar, no conditionals:
   *   - `true`          — forward the caller's value for this key verbatim.
   *   - `{ optional: true }` — forward the caller's value if set; if unset,
   *     the child simply doesn't see the key (the check's own code must
   *     already tolerate that — most checks do, via a documented fallback).
   *   - `{ anyOf: [...] }` — forward each named member under its own name
   *     if the caller has it set. Adopter-facing only: no core check may use
   *     this form unless its bin provably hard-requires one-of with no
   *     fallback path.
   *   - a literal string    — set the key to this exact value, never
   *     interpolated (`"$PATH"` is four characters, not an expansion).
   * Construction (not yet wired as the spawn default — see runner.ts) always
   * starts from a fixed baseline (`PATH`, `LANG`, `HOME`, `HTTPS_PROXY`,
   * `HTTP_PROXY`, `NO_PROXY`, `TMPDIR`) and only ADDS declared keys on top —
   * it never removes a baseline key.
   */
  env?: Record<string, true | { optional: true } | { anyOf: string[] } | string>
  /**
   * True for a check that can only meaningfully evaluate once a pull request
   * exists (it reads `PR_BODY`/`PR_NUMBER` from the open PR, not from local
   * git state) — `closes-n` and `test-plan` are the two core examples. The
   * runner's `localOnly` mode (set by the generated `pre-commit`/`pre-push`
   * hooks, never by CI) skips these entirely rather than running them with
   * nothing to evaluate: before a PR exists, `closes-n` cannot find the
   * `Closes #N` it requires and `test-plan` cannot find a merge-ready state,
   * so running them locally is not a stricter gate, it is an unsatisfiable
   * one — found live: the first commit on a fresh task branch could never
   * land, because the local hook enforced two pre-merge-only predicates
   * before the PR that would satisfy them could possibly exist. CI (which
   * only ever runs after a PR is open) always runs these for real.
   */
  requiresOpenPr?: boolean
}

/**
 * `skipped`: a `scope: 'diff'` check whose `include` globs matched no changed
 * file under `--diff-only`. Recorded explicitly rather than dropped, so a
 * skipped check is never misread as a passing one.
 */
export type CheckStatus = 'pass' | 'fail' | 'timeout' | 'error' | 'skipped'

export type CheckOutcome = {
  name: string
  status: CheckStatus
  /** null for `skipped` (never spawned) and `timeout` (killed, no exit). */
  exitCode: number | null
  errors: CheckError[]
  durationMs: number
}

/**
 * Emits one JSON line on stderr. The ONLY sanctioned way a check reports a
 * finding — stdout is reserved for human-readable chatter the runner ignores.
 *
 * Exit-code contract (enforced by the caller, not this function): 0 = pass,
 * 1 = findings. Anything else is read by the runner as `status: 'error'`.
 *
 * No-network-by-default is part of this contract: a check must not reach the
 * network unless it declares itself as one of the exceptions documented in
 * `apps/vinaya/specs/vinaya-spec.md`'s check-contract chapter (today: the
 * coherence and dispatch-readiness core checks).
 */
export function emitCheckError(error: CheckError): void {
  process.stderr.write(`${JSON.stringify(error)}\n`)
}
