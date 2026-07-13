/**
 * Dead-branch-push AUDIT (aeg-governance-hardening task 24, #364, Part 4 —
 * item 2). Distinct from the ring-0 `dead-branch-push-guard.ts` (task 18):
 * that predicate answers "should THIS push be allowed right now?" at push
 * time; this one answers "did commits land on a branch AFTER its PR already
 * resolved?" retrospectively, across every remote `task/*` branch — the
 * ring-2 backstop for the class the ring-0 hook is fail-open/hook-dependent
 * against (a writer without the hook installed, or a hook bypass). Pure —
 * no `fs`, no `gh`/`git` shell-outs. The CLI shim (`bin/dead-branch-audit.ts`,
 * joining task 23's `daily-drift` job) gathers each branch's most recent
 * PR (any state) plus its resolution/latest-commit timestamps and passes
 * them in here.
 *
 * Exists to catch the "six topology rows landed on a merged plan PR's
 * branch" incident class (2026-07-03) server-side, within a day, instead of
 * never — never-red discipline: `daily-drift` (the CI job that calls this)
 * must never fail red.
 */

export type DeadBranchFact = {
  branch: string
  prNumber: number
  prState: 'MERGED' | 'CLOSED'
  /** ISO timestamp the branch's PR was merged (MERGED) or closed (CLOSED). */
  resolvedAt: string
  /** ISO commit date of the branch's current remote tip. */
  latestCommitAt: string
}

export type DeadBranchPush = {
  branch: string
  prNumber: number
  prState: 'MERGED' | 'CLOSED'
  resolvedAt: string
  latestCommitAt: string
}

/**
 * Flags a branch whose current tip commit is strictly newer than its own
 * PR's resolution time — i.e. commits kept landing on a branch after the
 * forge already considered its work done. A branch whose tip predates (or
 * exactly matches) its PR's resolution is normal: the branch simply hasn't
 * been deleted yet, which is not itself a violation.
 */
export function findDeadBranchPushes(facts: DeadBranchFact[]): DeadBranchPush[] {
  return facts
    .filter((f) => new Date(f.latestCommitAt).getTime() > new Date(f.resolvedAt).getTime())
    .map(({ branch, prNumber, prState, resolvedAt, latestCommitAt }) => ({
      branch,
      prNumber,
      prState,
      resolvedAt,
      latestCommitAt
    }))
}
