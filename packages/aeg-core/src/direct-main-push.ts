/**
 * Direct-main-push detection (aeg-governance-hardening task 24, #364,
 * Part 3 — item 1). Pure — no `fs`, no `gh`/`git` shell-outs. The CLI shim
 * (`bin/check-direct-main-push.ts`) makes the one forge call (the
 * commits→pulls association API: `GET /repos/{owner}/{repo}/commits/{sha}/pulls`,
 * which GitHub documents as returning "the merged Pull Request that
 * introduced the commit to the repository" for a commit on the default
 * branch) and passes the result in here.
 *
 * Detection only, never prevention: branch protection is unavailable on
 * this private, free-plan repo, so a direct push to `main` cannot be
 * refused. This predicate only decides whether the pushed commit is
 * legitimate (associated with a merged PR) — the CLI shim opens an
 * incident Issue and fails the run loudly on a violation; it never reverts
 * or mutates anything (Principal decision, brief §11).
 */

export type DirectMainPushFact = {
  sha: string
  /** PR numbers the commits→pulls association API reports as MERGED for this commit. Empty when the commit has no associated merged PR — i.e. it was pushed directly. */
  associatedMergedPrNumbers: number[]
}

export type DirectMainPushResult =
  | { verdict: 'legitimate'; mergedPrNumber: number }
  | { verdict: 'direct-push'; sha: string }

/**
 * `legitimate` — at least one merged PR is associated with this commit (the
 *   normal case: a squash-merge or merge commit that landed via a PR).
 * `direct-push` — no associated merged PR at all. This is the violation:
 *   either a genuine direct push, or (equivalently suspicious) a commit the
 *   association API cannot explain.
 */
export function checkDirectMainPush(fact: DirectMainPushFact): DirectMainPushResult {
  const [first] = fact.associatedMergedPrNumbers
  if (first !== undefined) return { verdict: 'legitimate', mergedPrNumber: first }
  return { verdict: 'direct-push', sha: fact.sha }
}
