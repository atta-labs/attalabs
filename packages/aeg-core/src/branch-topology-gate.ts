import { parseIteration } from './parse-iteration'

/**
 * Branch↔topology gate (aeg-governance-hardening task 32, #399). Pure — no
 * `fs`, no shell-outs. The CLI shim (`bin/check-branch-topology.ts`) reads
 * `aeg-root/iterations/<iteration>.md` and passes its content (or `null`
 * when the file is absent) in here.
 *
 * Closes the D-073 logic fork: `.husky/pre-push` used to answer "does this
 * branch's task-id suffix have a topology row?" with a hand-rolled
 * `grep -qE "^\|[[:space:]]*${id}[[:space:]]*\|"` against the iteration
 * file — a bash reimplementation of the table-parsing that `parseIteration`
 * already does authoritatively for Studio and `verify-dispatch`. Row
 * membership is now `parseIteration(md).tasks`, and the refusal messages
 * are byte-identical to the inline ones the hook printed before.
 */

export type BranchTopologyInput = {
  /** The full branch name being pushed — used verbatim in refusal messages. */
  branch: string
  /** Iteration slug extracted from the branch (segment 2). */
  iteration: string
  /** Task id extracted from the branch (segment 3). */
  taskId: string
  /** Repo-relative topology path — used verbatim in refusal messages. */
  topoPath: string
  /** Topology file content, or `null` when the file does not exist. */
  topoMarkdown: string | null
}

export type BranchTopologyVerdict = 'allow' | 'refuse'

export type BranchTopologyResult = { verdict: BranchTopologyVerdict; reason: string }

/**
 * Mirror the hook's original field extraction exactly: its shell `case`
 * pattern — `task/` followed by two wildcard segments, where the shell `*`
 * also matches `/` and the empty string — decided whether the check
 * applied, and `cut -d/ -f2` / `-f3` picked the iteration and task id;
 * segments beyond the third were ignored, exactly as `cut` ignored them.
 * Returns `null` when the branch would not have matched that `case`
 * pattern, i.e. when the hook would have skipped the check entirely.
 */
export function taskBranchTopologyFields(branch: string): { iteration: string; taskId: string } | null {
  if (!/^task\/.*\/.*$/.test(branch)) return null
  const parts = branch.split('/')
  return { iteration: parts[1] ?? '', taskId: parts[2] ?? '' }
}

/**
 * `allow`  — the topology file exists and `parseIteration` finds a Tasks-table
 *            row whose `#` column literal-equals the branch's task-id suffix.
 * `refuse` — the iteration file is missing (D-073/D-075), or no row matches
 *            (D-073). Reasons are byte-identical to the hook's pre-task-32
 *            inline messages, so a refused push reads exactly as before.
 */
export function checkBranchTopology(input: BranchTopologyInput): BranchTopologyResult {
  const { branch, iteration, taskId, topoPath, topoMarkdown } = input

  if (topoMarkdown === null) {
    return {
      verdict: 'refuse',
      reason:
        `✖ pre-push: branch \`${branch}\` names iteration \`${iteration}\`, but ${topoPath} does not exist.\n` +
        '  A task branch must belong to a real iteration (D-073/D-075).'
    }
  }

  const hasRow = parseIteration(topoMarkdown).tasks.some((t) => t.id === taskId)
  if (!hasRow) {
    return {
      verdict: 'refuse',
      reason:
        `✖ pre-push: branch \`${branch}\` — no row with \`#\` = \`${taskId}\` in ${topoPath}.\n` +
        "  The branch suffix must literal-match the topology's # column (D-073).\n" +
        "  If the plan PR adding this row hasn't merged yet, merge it first (D-075)."
    }
  }

  return {
    verdict: 'allow',
    reason: `Branch \`${branch}\` matches topology row \`${taskId}\` in ${topoPath}.`
  }
}
