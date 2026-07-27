/**
 * Dead-branch push guard (aeg-governance-hardening task 18, #335). Pure — no
 * `fs`, no `gh`/`git` shell-outs. The CLI shim (`bin/check-push-target.ts`)
 * makes the one batched forge call (`gh pr list --head <branch> --state all
 * --json number,state --limit 1`), maps its result to a `PrStateFact`, and
 * passes it in here.
 *
 * Exists to answer, deterministically, "is it safe to push more commits to
 * this `task/<tranche>/<n>` branch?" — closing the live-fire incident
 * class where stale local work landed on a branch whose PR had already
 * merged, silently reopening/confusing forge state with no push-time signal.
 *
 * `UNKNOWN` (forge unreachable — network flake, auth issue, rate limit) maps
 * to `allow`, the same as `NONE` (no PR exists yet — a brand-new branch
 * legitimately has none). This is a deliberate fail-open choice: a guard
 * that can block *all* pushes on a transient forge-reachability issue is
 * worse than the bug it fixes. See `aeg-root/enforcement.md`.
 */

export type PrStateFact = 'MERGED' | 'CLOSED' | 'OPEN' | 'NONE' | 'UNKNOWN'

export type DeadBranchPushInput = {
  /** The `task/<tranche>/<n>` branch being pushed. */
  branch: string
  /** State of the branch's most recent PR (any state), or the fact that none/forge-unreachable applies. */
  prState: PrStateFact
  /** The PR number that `prState` refers to, or `null` when no PR exists / could not be determined. */
  prNumber: number | null
}

export type DeadBranchPushVerdict = 'allow' | 'refuse'

export type DeadBranchPushResult = { verdict: DeadBranchPushVerdict; reason: string }

/**
 * `allow`  — `OPEN`/`NONE`/`UNKNOWN`: an in-flight PR, no PR yet, or the
 *            forge couldn't be reached — all legitimate reasons to push.
 * `refuse` — `MERGED`/`CLOSED`: the branch's most recent PR is already
 *            resolved. Pushing here would silently resurrect resolved forge
 *            state instead of starting a fresh branch.
 */
export function checkDeadBranchPush(input: DeadBranchPushInput): DeadBranchPushResult {
  const { branch, prState, prNumber } = input

  if (prState === 'MERGED') {
    return {
      verdict: 'refuse',
      reason: `Branch \`${branch}\` already has a MERGED PR (#${prNumber}) — this branch's work is done. Push a new task branch instead of pushing onto an already-resolved one.`
    }
  }

  if (prState === 'CLOSED') {
    return {
      verdict: 'refuse',
      reason: `Branch \`${branch}\` has a CLOSED PR (#${prNumber}) that was never merged — pushing here would resurrect abandoned/rejected work. Open a new task branch instead.`
    }
  }

  if (prState === 'OPEN') {
    return {
      verdict: 'allow',
      reason: `Branch \`${branch}\` has an OPEN PR (#${prNumber}) — pushing more commits to it is normal.`
    }
  }

  if (prState === 'NONE') {
    return {
      verdict: 'allow',
      reason: `Branch \`${branch}\` has no PR yet — a brand-new task branch legitimately has none.`
    }
  }

  return {
    verdict: 'allow',
    reason: `Could not determine \`${branch}\`'s PR state (forge unreachable) — failing open rather than blocking the push on a transient issue.`
  }
}
