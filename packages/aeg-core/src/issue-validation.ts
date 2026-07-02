/**
 * Planner→Brief Issue-rationale grammar (D-078). Pure — no `fs`, no `fetch`,
 * no `process.env`. The tool-layer gate (`bin/open-issue.ts`, invoked because
 * the `check-forge-gates.sh` hook denies raw `gh issue create`) calls
 * `checkIssueRationale` before any task Issue can reach the forge.
 *
 * A task Issue's body must carry every producer field of the
 * `aeg-root/contracts/planner-brief.md` contract — the eight Planner's
 * rationale fields. D-055 makes cutting the Issue with its rationale the
 * canonical plan act; an Issue without the full rationale forces the Brief
 * Author to re-derive the Planner's dig cold, the exact loss the contract
 * exists to prevent. Presence-only, like `brief-validation.ts`: content
 * quality stays a judgment call; existence does not.
 *
 * Applies to task Issues only (label `iteration:<slug>`) — the caller decides
 * applicability from the labels; this module only checks the body.
 */

export type IssueSectionResult = { status: 'pass' | 'fail'; errors: string[] }

/**
 * Tolerant field detector: accepts the two live rationale styles —
 * `**Field** — …` bold-inline (e.g. Issue #309) and `### Field` headings
 * (e.g. Issue #219). Case-insensitive.
 */
function hasRationaleField(body: string, labelPattern: string): boolean {
  const re = new RegExp(`(?:\\*\\*|^#{1,4}\\s+)\\s*${labelPattern}`, 'im')
  return re.test(body)
}

/** The eight producer fields of the planner-brief contract, with tolerant label patterns. */
const RATIONALE_FIELDS: Array<{ name: string; pattern: string }> = [
  { name: 'Boundary', pattern: 'Boundary' },
  { name: 'Sizing', pattern: 'Sizing' },
  { name: 'Project(s) + blast radius', pattern: 'Project\\(s\\)|Project(?:s)?\\s*\\+|blast radius' },
  { name: 'Dependency rationale', pattern: 'Dependency rationale|Depends[- ]on' },
  { name: 'Traps to avoid', pattern: 'Traps' },
  { name: 'Suggested agent-class', pattern: '(?:Suggested\\s+)?agent-class' },
  { name: 'Stop-and-escalate', pattern: 'Stop-and-escalate' },
  { name: 'Docs to keep coherent', pattern: 'Docs to keep coherent|§7' }
]

/**
 * Every one of the eight Planner's-rationale fields must be present in a task
 * Issue's body. One error line per missing field, mirroring
 * `checkBriefSections`'s error style.
 */
export function checkIssueRationale(body: string): IssueSectionResult {
  const errors = RATIONALE_FIELDS.filter((f) => !hasRationaleField(body, f.pattern)).map(
    (f) =>
      `issue-validation ${f.name}: rationale field not found in the Issue body — every task Issue carries the full Planner's rationale (aeg-root/contracts/planner-brief.md, D-055).`
  )
  return { status: errors.length > 0 ? 'fail' : 'pass', errors }
}

/** true when any label marks this as a task Issue (the rationale contract applies). */
export function isTaskIssueLabelSet(labels: string[]): boolean {
  return labels.some((l) => l.startsWith('iteration:'))
}
