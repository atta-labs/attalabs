/**
 * First-push dispatch gate (aeg-governance-hardening task 25, #365). Pure —
 * no `fs`, no `gh`/`git` shell-outs. The CLI shim (`bin/check-first-push-
 * dispatch.ts`, wired into `.husky/pre-push`) runs the UNCHANGED
 * `verify-dispatch.ts` gate mode once on a `task/<tranche>/<n>` branch's
 * first push, maps its exit/output to a `DispatchReadinessFact`, and passes
 * it in here.
 *
 * Mechanizes `roles/developer.md`'s entry-gate items 3–7 at the earliest
 * possible moment — the first push — instead of relying on the Developer to
 * run `verify-dispatch.ts` by hand before Step 0. Subsequent pushes (once a
 * PR exists) skip the gate: dispatch readiness was validated once, and
 * re-blocking mid-task on a sibling's later state change would strand
 * in-flight work.
 *
 * `UNKNOWN` (forge unreachable — `verify-dispatch.ts`'s own `severity:infra`
 * marker, printed when repo/token resolution fails) maps to `allow`, the
 * same deliberate fail-open choice `dead-branch-push-guard.ts` already makes
 * for the sibling gate: a guard that can block *all* pushes on a
 * transient forge-reachability issue is worse than the bug it fixes. See
 * `aeg-root/enforcement.md`.
 */

/** A `task/<tranche>/<n>` branch parses to its two topology coordinates; anything else does not. */
export function parseTaskBranch(branch: string): { tranche: string; taskId: string } | null {
  const m = /^task\/([^/]+)\/([^/]+)$/.exec(branch)
  return m ? { tranche: m[1] as string, taskId: m[2] as string } : null
}

export type DispatchReadinessFact = 'READY' | 'NOT_READY' | 'UNKNOWN'

export type FirstPushDispatchGateInput = {
  /** The branch being pushed. */
  branch: string
  /** Whether a PR already exists for this branch — the hook's existing C5/ detection, reused, never re-derived here. */
  prExists: boolean
  /** verify-dispatch's classified result. Irrelevant (never read) when the branch is not a task branch or a PR already exists. */
  readiness: DispatchReadinessFact
}

export type FirstPushDispatchGateVerdict = 'allow' | 'refuse'

export type FirstPushDispatchGateResult = { verdict: FirstPushDispatchGateVerdict; reason: string }

export function checkFirstPushDispatchGate(input: FirstPushDispatchGateInput): FirstPushDispatchGateResult {
  const { branch, prExists, readiness } = input

  if (parseTaskBranch(branch) === null) {
    return {
      verdict: 'allow',
      reason: `Branch \`${branch}\` is not a task/<tranche>/<n> branch — the first-push dispatch gate only applies to task branches.`
    }
  }

  if (prExists) {
    return {
      verdict: 'allow',
      reason: `Branch \`${branch}\` already has an open PR — dispatch readiness was already validated on its first push; later pushes are not re-blocked by a sibling task's state change.`
    }
  }

  if (readiness === 'UNKNOWN') {
    return {
      verdict: 'allow',
      reason: `verify-dispatch could not reach the forge for \`${branch}\` (repo/token unresolvable) — failing OPEN rather than blocking the push on a transient issue.`
    }
  }

  if (readiness === 'NOT_READY') {
    return {
      verdict: 'refuse',
      reason: `verify-dispatch reports NOT READY for \`${branch}\` — see the failing predicate printed above.`
    }
  }

  return {
    verdict: 'allow',
    reason: `verify-dispatch reports READY TO DISPATCH for \`${branch}\`.`
  }
}
