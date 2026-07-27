/**
 * Leftover-worktree/branch classification (aeg-governance-hardening task 11,
 * #324). Pure — no `fs`, no `git` shell-outs. The CLI shim
 * (`bin/verify-dispatch.ts`) gathers the three facts (does the remote branch
 * exist, does a local worktree exist, how many commits is the branch ahead
 * of main) and passes them in.
 *
 * Exists to answer, deterministically, "is it safe to run Step 0's
 * `git worktree add -b <branch> origin/main` for this task?" — Step 0 itself
 * never creates a commit, so ANY commit already ahead of main on this branch
 * is real prior work, never an artifact of re-running Step 0. Silently
 * recreating a branch that already has commits ahead of main would discard
 * that work — the failure this module exists to prevent.
 */

export type LeftoverInput = {
  /** A `task/<tranche>/<n>` branch already exists on the forge remote. */
  branchExistsRemote: boolean
  /** A local worktree for this task already exists on disk. */
  worktreeExistsLocal: boolean
  /** Commits on the task branch that are not yet on `origin/main`. */
  commitsAheadOfMain: number
}

export type LeftoverVerdict = 'clean' | 'resume' | 'stop'

export type LeftoverResult = { verdict: LeftoverVerdict; reason: string }

/**
 * `clean`  — no branch, no worktree, zero commits ahead: safe to run Step 0 fresh.
 * `resume` — a branch or worktree already exists but carries zero commits
 *            ahead of main (e.g. a prior Step 0 ran but no work was
 *            committed yet): reuse the existing worktree rather than
 *            recreating it, but there is nothing to lose either way.
 * `stop`   — commits already ahead of main exist: real work is already on
 *            this branch. Never silently discard it — the Developer must
 *            resume in the existing worktree, not re-run Step 0.
 */
export function classifyLeftover(input: LeftoverInput): LeftoverResult {
  const { branchExistsRemote, worktreeExistsLocal, commitsAheadOfMain } = input

  if (commitsAheadOfMain > 0) {
    return {
      verdict: 'stop',
      reason: `${commitsAheadOfMain} commit(s) already ahead of origin/main on this task branch — real work exists. Do not re-run Step 0 (which would branch fresh from origin/main and orphan that work); resume in the existing worktree instead.`
    }
  }

  if (branchExistsRemote || worktreeExistsLocal) {
    return {
      verdict: 'resume',
      reason: `A ${branchExistsRemote ? 'remote branch' : ''}${branchExistsRemote && worktreeExistsLocal ? ' and a ' : ''}${worktreeExistsLocal ? 'local worktree' : ''} already exist for this task, with zero commits ahead of main — reuse it rather than recreating (\`git worktree add\` on an existing branch/dir will fail anyway).`
    }
  }

  return {
    verdict: 'clean',
    reason: 'No branch, no worktree, no commits ahead of main — safe to run Step 0 fresh.'
  }
}
