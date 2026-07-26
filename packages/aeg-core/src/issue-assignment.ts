import { parseTaskBranch } from './first-push-dispatch-gate'

/**
 * First-push Issue self-assignment (aeg-governance-hardening task 33, #401).
 * Pure — no `fs`, no `gh`/`git` shell-outs. The CLI shim
 * (`bin/assign-task-issue.ts`, wired into `.husky/pre-push`) gathers the
 * facts — does the remote ref already exist, which Issue does the topology
 * row name, who is currently assigned, who is the authenticated pusher —
 * and this evaluator decides whether to assign.
 *
 * Produces the signal Studio's dispatch-visibility chip (task 26, #368)
 * renders: `facts.assigned = assigneesCount > 0`. Assignment had never been
 * mechanized anywhere — it happened only when the Principal remembered to
 * assign by hand, so a genuinely in-flight task (task 28, #372: two real
 * commits pushed) looked identical to an untouched one. The task branch's
 * FIRST real push is the earliest genuine "in flight" evidence (assigning
 * at brief-authoring time would reintroduce the false positive task 26 was
 * built to avoid), so that is the moment this fires.
 *
 * Every guard skips rather than errors — this is a visibility nicety, never
 * a gate. In particular: `assignees`/`login` arriving as `null` (a failed
 * `gh` call) means "no signal", and no-signal means no action — never a
 * guess, never a block.
 */

export type IssueAssignmentInput = {
  /** The branch being pushed. */
  branch: string
  /**
   * Whether the remote ref already exists — from the pre-push stdin's
   * remote-sha (all zeros = the ref is being created by this push, i.e.
   * genuinely the first push). A force-push to an existing branch keeps a
   * non-zero remote-sha and therefore never re-triggers; deleting and
   * recreating the remote branch re-presents a zero sha, which the
   * already-assigned no-op below absorbs.
   */
  remoteRefExists: boolean
  /** The topology row's Issue number, or `null` when the row or its Issue cell could not be resolved. */
  issue: number | null
  /** Current assignee logins on the Issue, or `null` when the fetch failed. */
  assignees: string[] | null
  /** The authenticated `gh` login — the actual pusher — or `null` when unresolvable. Never a hardcoded fallback. */
  login: string | null
}

export type IssueAssignmentDecision =
  | { action: 'assign'; issue: number; login: string; reason: string }
  | { action: 'skip'; reason: string }

export function decideIssueAssignment(input: IssueAssignmentInput): IssueAssignmentDecision {
  const { branch, remoteRefExists, issue, assignees, login } = input

  if (parseTaskBranch(branch) === null) {
    return {
      action: 'skip',
      reason: `Branch \`${branch}\` is not a task/<iteration>/<n> branch — Issue self-assignment only applies to task branches.`
    }
  }

  if (remoteRefExists) {
    return {
      action: 'skip',
      reason: `Branch \`${branch}\` already exists on the remote — not its first push, nothing to assign.`
    }
  }

  if (issue === null) {
    return {
      action: 'skip',
      reason: `No Issue resolved for \`${branch}\` from its topology row — skipping self-assignment (the gate owns refusing an unplanned branch).`
    }
  }

  if (assignees === null) {
    return {
      action: 'skip',
      reason: `Could not read Issue #${issue}'s current assignees — skipping rather than risking a double-assign (fail-open, never a guess).`
    }
  }

  if (assignees.length > 0) {
    return {
      action: 'skip',
      reason: `Issue #${issue} is already assigned (${assignees.join(', ')}) — no-op.`
    }
  }

  if (login === null) {
    return {
      action: 'skip',
      reason:
        'Could not resolve the authenticated `gh` login — never assigning anyone other than the actual pusher, so skipping.'
    }
  }

  return {
    action: 'assign',
    issue,
    login,
    reason: `First push of \`${branch}\` — assigning Issue #${issue} to @${login} (the authenticated pusher).`
  }
}
