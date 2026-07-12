/**
 * actions.ts — the canonical, aeg-core-owned enumeration of every AEG action
 * that either crosses into GitHub or hands work across a role-seam contract.
 * Pure data, zero I/O, zero imports beyond the type itself — same discipline
 * as `waiver-label.ts`.
 *
 * Two consumers read this one list (Issue #505): G3's "no seventh way into
 * GitHub" completeness story (`registry-checks.ts`) targets the
 * `crosses: 'into-github'` subset against `enforcement.md`'s Ring-0 gate rows;
 * task 506's DiagramModel places each action both inside a ring-0 gate (as a
 * guarded crossing) and on the edge between role/contract nodes (as a seam
 * hand-off). One list, so an `ACTIONS.length`-driven diagram edge count and
 * G3's crossing list can never drift apart.
 *
 * The set is 10 distinct actions, not 12: the 6 crossings named in Issue #505
 * plus 4 seam-only actions. Two of the six contract seams are already
 * accomplished by a GitHub crossing (the Planner→Brief seam's carrier is the
 * Issue body, created by `create-a-task-issue`; the Developer→Reviewer seam's
 * carrier is the PR, created by `open-a-pull-request`), so they get no
 * duplicate id — inventing one would give two ids for one real act and break
 * any `ACTIONS.length`-driven edge count.
 *
 * `crosses` is factually per-action, not a mirror of Issue #505's prose:
 * `commit-the-work` is `'none'` because `git commit` never leaves the local
 * machine — it is `git push` (`publish-the-branch`) that reaches the
 * GitHub-hosted remote. `enforcement.md`'s own Ring-0 table lists them as
 * separate rows (`.husky/pre-commit` vs `.husky/pre-push`) for exactly this
 * reason. See D-119.
 *
 * The only valid `performedBy` values are the 9 `role_id`s under
 * `aeg-root/roles/*.md` (task 2, #522) — asserted by the real-file test.
 */

export type ActionCrossing = 'into-github' | 'none'

export type Action = {
  id: string
  label: string
  crosses: ActionCrossing
  performedBy: string[] // role_id[]
}

export const ACTIONS: Action[] = [
  {
    id: 'publish-the-branch',
    label: 'publish the branch',
    crosses: 'into-github',
    performedBy: ['developer']
  },
  {
    id: 'create-a-task-issue',
    label: 'create a task issue',
    crosses: 'into-github',
    performedBy: ['planner']
  },
  {
    id: 'open-a-pull-request',
    label: 'open a pull request',
    crosses: 'into-github',
    performedBy: ['developer']
  },
  {
    id: 'revise-a-pull-request',
    label: 'revise a pull request',
    crosses: 'into-github',
    performedBy: ['developer', 'planner']
  },
  {
    id: 'grant-a-waiver',
    label: 'grant a waiver',
    crosses: 'into-github',
    performedBy: ['principal']
  },
  {
    id: 'commit-the-work',
    label: 'commit the work',
    crosses: 'none',
    performedBy: ['developer']
  },
  {
    id: 'author-the-brief',
    label: 'author the brief',
    crosses: 'none',
    performedBy: ['team-leader']
  },
  {
    id: 'produce-the-verdict',
    label: 'produce the verdict',
    crosses: 'none',
    performedBy: ['reviewer', 'security']
  },
  {
    id: 'post-provenance-comment',
    label: 'post the provenance comment',
    crosses: 'none',
    performedBy: ['archivist']
  },
  {
    id: 'write-the-retrospective',
    label: 'write the retrospective',
    crosses: 'none',
    performedBy: ['iteration-archivist']
  }
]

// A stable keyword per into-github action that must appear (case-insensitive)
// in some real Ring-0 gate row's action text — the "feeds G3" tripwire from
// Issue #505. If enforcement.md ever drops the gate row backing a crossing,
// the corresponding assertion fails. grant-a-waiver's keyword is
// `pull request`: granting a waiver is an act on a pull request (labeling it),
// honored at the Ring-0 PR-creation/editing gate and refused-from-agents at
// the raw-API gate — both reference pull requests. See PR body.
//
// Consumed by both `actions.test.ts` (the crossing tripwire) and
// `diagram-model.ts` (the `guards` gate→action edges), so the one keyword map
// can never drift between them (D-119, same no-drift principle as ACTIONS).
export const CROSSING_KEYWORDS: Record<string, string> = {
  'publish-the-branch': 'git push',
  'create-a-task-issue': 'task issue',
  'open-a-pull-request': 'pull request',
  'revise-a-pull-request': 'pull request',
  'grant-a-waiver': 'pull request'
}
