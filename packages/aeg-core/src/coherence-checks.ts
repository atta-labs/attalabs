/**
 * verify-coherence pure check evaluators — deterministic plan↔forge coherence
 * oracle logic (A1/A2/A3, T1/T2/T3, D1, L1/L2/L3, closes-N). Per D-067.
 *
 * Pure — no `fs`, no `fetch`, no `process.env`. All forge facts and iteration
 * topology are injected by the caller (`bin/verify-coherence.ts`, the I/O shim).
 */

import { anchoredRegion } from './anchored-region'
import { checkIssueRationale, isTaskIssueLabelSet } from './issue-validation'
import type { ForgeFacts, Iteration, Task } from './types'

// ---------- grandfather cutoff -----------------------------------------------

/**
 * Incoherences whose terminal forge event predates this date are grandfathered:
 * emitted as `status: "info"` (visible in the report) rather than `"fail"`
 * (which blocks CI). Applies to A1/A2/A3/T3.
 *
 * Rationale: branch protection is unavailable on the free plan; pre-existing
 * repo-wide debt (legacy vada/herald/aeg-ui iterations) can't be retro-fixed,
 * so a hard gate on those findings would make every new PR un-mergeable.
 */
export const COHERENCE_ENFORCED_FROM = '2026-07-01'

/** True when `isoDate` is an ISO string whose date portion is strictly before `COHERENCE_ENFORCED_FROM`. */
export function isGrandfathered(isoDate: string | null | undefined): boolean {
  if (!isoDate) return false
  return isoDate.slice(0, 10) < COHERENCE_ENFORCED_FROM
}

/**
 * R1 grandfather — explicit, data-declared Issue numbers whose body predates
 * the D-078 rationale grammar (or predates R1 enforcement) and is therefore
 * exempted from blocking. Unlike A1/A2/A3/T3's date-based cutoff, an Issue
 * body carries no reliable "authored under which grammar" timestamp, so this
 * is an explicit number set rather than a date proxy — populated once, at
 * `aeg-governance-hardening` task 1 implementation time, with exactly the
 * active-iteration task Issues that failed `checkIssueRationale` against the
 * live forge (see the task's PR body for the list + counts).
 *
 * New/edited task Issues are already gated at ring 0 (`bin/open-issue.ts`,
 * D-078) — this list is visible debt for the pre-gate stock, not a standing
 * exemption mechanism. Do not add to it going forward; fix the Issue body
 * instead (D-055's rationale contract).
 */
export const R1_GRANDFATHERED_ISSUES: ReadonlySet<number> = new Set([
  183, 184, 185, 186, 187, 188, 240, 241, 244, 279, 280, 281, 282
])

// ---------- types -------------------------------------------------------------

export type CheckFailure = {
  issue?: number | null
  iteration: string
  task?: string
  reason: string
  /** True when the terminal event predates `COHERENCE_ENFORCED_FROM` — finding is info, not fail. */
  grandfathered?: boolean
}

export type CheckResult = {
  check: string
  status: 'pass' | 'fail' | 'info'
  failures: CheckFailure[]
  note?: string
}

export type TaskEntry = {
  iterationSlug: string
  archived: boolean
  task: Task
  /** `undefined` when the forge was unavailable or the issue didn't exist. */
  facts: ForgeFacts | undefined
}

export type IterationFile = {
  slug: string
  archived: boolean
  iteration: Iteration
}

// ---------- pure check evaluators --------------------------------------------

/**
 * A1: Every closed task-Issue has a merged closing PR.
 * Fail class: `closed-without-merge`
 * Terminal event date: `issueClosedAt` — grandfathered when before `COHERENCE_ENFORCED_FROM`.
 */
export function checkA1(entries: TaskEntry[]): CheckResult {
  const failures: CheckFailure[] = []
  for (const e of entries) {
    if (!e.facts) continue
    if (e.facts.issueState === 'closed' && e.facts.prState !== 'merged') {
      failures.push({
        issue: e.task.issue,
        iteration: e.iterationSlug,
        task: e.task.id,
        reason: `Issue closed but closing PR is not merged (prState: ${e.facts.prState})`,
        grandfathered: isGrandfathered(e.facts.closedAt)
      })
    }
  }
  const activeFails = failures.filter((f) => !f.grandfathered)
  const status = activeFails.length > 0 ? 'fail' : failures.length > 0 ? 'info' : 'pass'
  return {
    check: 'A1',
    status,
    failures,
    note: status === 'info' ? `${failures.length} grandfathered (pre-${COHERENCE_ENFORCED_FROM})` : undefined
  }
}

/**
 * A2: The closing PR of each closed task-Issue carries an Archivist provenance block.
 * Fail class: `archived-without-provenance`
 * Terminal event date: `prMergedAt` — grandfathered when before `COHERENCE_ENFORCED_FROM`.
 *
 * `hasProvenanceByKey`: Map keyed by `${iterSlug}/${taskId}` → true when the
 * closing PR has a comment containing `### AEG provenance`.
 */
export function checkA2(entries: TaskEntry[], hasProvenanceByKey: Map<string, boolean>): CheckResult {
  const failures: CheckFailure[] = []
  for (const e of entries) {
    if (!e.facts) continue
    // Only check tasks whose issue is closed AND whose closing PR merged.
    if (e.facts.issueState !== 'closed' || e.facts.prState !== 'merged') continue
    const key = `${e.iterationSlug}/${e.task.id}`
    const hasProvenance = hasProvenanceByKey.get(key)
    // If key is absent from the map we were unable to fetch (forge error); skip.
    if (hasProvenance === undefined) continue
    if (!hasProvenance) {
      failures.push({
        issue: e.task.issue,
        iteration: e.iterationSlug,
        task: e.task.id,
        reason: 'Closing PR has no `### AEG provenance` comment (Archivist close-out missing)',
        grandfathered: isGrandfathered(e.facts.mergedAt)
      })
    }
  }
  const activeFails = failures.filter((f) => !f.grandfathered)
  const status = activeFails.length > 0 ? 'fail' : failures.length > 0 ? 'info' : 'pass'
  return {
    check: 'A2',
    status,
    failures,
    note: status === 'info' ? `${failures.length} grandfathered (pre-${COHERENCE_ENFORCED_FROM})` : undefined
  }
}

/**
 * A3: Every Issue whose closing PR merged is itself closed.
 * Fail class: `auto-close-misfire` — the headline check (#174 class).
 * Terminal event date: `prMergedAt` — grandfathered when before `COHERENCE_ENFORCED_FROM`.
 */
export function checkA3(entries: TaskEntry[]): CheckResult {
  const failures: CheckFailure[] = []
  for (const e of entries) {
    if (!e.facts) continue
    if (e.facts.prState === 'merged' && e.facts.issueState !== 'closed') {
      failures.push({
        issue: e.task.issue,
        iteration: e.iterationSlug,
        task: e.task.id,
        reason: 'Closing PR is merged but Issue is still open (GitHub auto-close misfire)',
        grandfathered: isGrandfathered(e.facts.mergedAt)
      })
    }
  }
  const activeFails = failures.filter((f) => !f.grandfathered)
  const status = activeFails.length > 0 ? 'fail' : failures.length > 0 ? 'info' : 'pass'
  return {
    check: 'A3',
    status,
    failures,
    note: status === 'info' ? `${failures.length} grandfathered (pre-${COHERENCE_ENFORCED_FROM})` : undefined
  }
}

/**
 * T1: Every topology row's Issue ref resolves to a real Issue.
 * Fail class: `phantom-issue-ref`
 *
 * A task has a non-null issue number in the topology but is absent from the
 * forge facts map → the issue doesn't exist on GitHub.
 */
export function checkT1(entries: TaskEntry[]): CheckResult {
  const failures: CheckFailure[] = []
  for (const e of entries) {
    // Skip: issue was null in topology (TBD or empty); T3 handles that.
    if (e.task.issue === null) continue
    // facts === undefined and issue !== null → forge query returned nothing for this issue
    if (e.facts === undefined) {
      failures.push({
        issue: e.task.issue,
        iteration: e.iterationSlug,
        task: e.task.id,
        reason: `Issue #${e.task.issue} in topology does not resolve to a real GitHub Issue`
      })
    }
  }
  return { check: 'T1', status: failures.length > 0 ? 'fail' : 'pass', failures }
}

/**
 * T2: Every open Issue labeled `iteration:X` appears in X's topology file.
 * Fail class: `orphan-task`
 *
 * `openIssuesBySlug`: Map from active iteration slug → list of open issue
 * numbers fetched from the forge with that `iteration:` label.
 * `topologyIssuesBySlug`: Map from slug → Set of issue numbers in the topology.
 *
 * `ciIterationSlug`: when set (parsed from `BRANCH`/`GITHUB_HEAD_REF` env),
 *   only the iteration matching that slug is checked — prevents a coherence
 *   gap in one iteration's topology (e.g. a Planner plan-PR mid-flight) from
 *   blocking CI on an unrelated PR against a different iteration. Mirrors
 *   `checkT3`'s `ciIterationSlug` parameter exactly.
 */
export function checkT2(
  openIssuesBySlug: Map<string, number[]>,
  topologyIssuesBySlug: Map<string, Set<number>>,
  ciIterationSlug?: string | null
): CheckResult {
  const failures: CheckFailure[] = []
  for (const [slug, openNums] of openIssuesBySlug) {
    if (ciIterationSlug && slug !== ciIterationSlug) continue

    const topologySet = topologyIssuesBySlug.get(slug) ?? new Set<number>()
    for (const num of openNums) {
      if (!topologySet.has(num)) {
        failures.push({
          issue: num,
          iteration: slug,
          reason: `Issue #${num} is open and labeled iteration:${slug} but does not appear in the topology file`
        })
      }
    }
  }
  return { check: 'T2', status: failures.length > 0 ? 'fail' : 'pass', failures }
}

/**
 * T2 point-of-power relocation (aeg-governance-hardening task 24, #364,
 * Part 2 — D-082; supersedes half of task 19's T2-in-task-PR-CI placement).
 * A gate may only red a PR that could cause or cure the violation it
 * reports — live incident #363 (2026-07-04): registering Issues #364/#365
 * correctly reddened same-iteration task PR #363's CI, which could neither
 * have caused nor fixed the topology gap. `checkT2`'s own assertion logic
 * (above) is untouched; this only demotes its CI-blocking status when the
 * current PR is NOT a plan PR (i.e. its diff doesn't touch an iteration
 * topology file) — the only PR kind that can actually close a T2 gap. The
 * underlying findings stay visible (`status: 'info'`, never omitted) for
 * every other context: task-PR CI, `--json`/audit mode, and daily-drift.
 */
export function scopeT2ToPlanPr(result: CheckResult, isPlanPr: boolean): CheckResult {
  if (isPlanPr || result.status !== 'fail') return result
  return {
    ...result,
    status: 'info',
    note:
      result.note ??
      'T2 findings are non-blocking outside plan PRs (D-082, point-of-power principle) — see aeg-root/enforcement.md.'
  }
}

/**
 * T3: No `#TBD` rows in an active iteration.
 * Fail class: `tbd-in-active-iteration`
 *
 * A task in an active iteration has a null issue ref (empty / `—` / `#TBD`).
 *
 * `ciIterationSlug`: when set (parsed from `BRANCH`/`GITHUB_HEAD_REF` env),
 *   only tasks in THAT iteration are checked — prevents vada/herald legacy
 *   #TBD rows from blocking a PR against an unrelated iteration.
 *
 * `enrichedEntries`: when provided (post-forge-fetch), used to determine if an
 *   iteration predates `COHERENCE_ENFORCED_FROM` by proxy: if the iteration has
 *   any task whose `closedAt` or `mergedAt` is pre-cutoff, its #TBD rows are
 *   grandfathered as `info`.
 *
 * `forgeUnavailableSlugs`: iteration slugs whose forge snapshot fetch failed
 *   entirely (the caller couldn't fetch `closedAt`/`mergedAt` for ANY task in
 *   that iteration). A `#TBD` row in one of these iterations cannot be evaluated
 *   against the grandfather proxy at all — treating it as `grandfathered: false`
 *   would silently fail it purely because of a forge outage, not because it's
 *   genuinely un-grandfathered. Such rows are reported `grandfathered: true`
 *   with a distinct reason so they never produce a `fail`, but remain visible.
 */
export function checkT3(
  entries: TaskEntry[],
  ciIterationSlug?: string | null,
  enrichedEntries?: TaskEntry[],
  forgeUnavailableSlugs?: Set<string>
): CheckResult {
  // Build set of iterations that are pre-enforcement (by proxy: any task with a pre-cutoff date).
  const preEnforcement = new Set<string>()
  if (enrichedEntries) {
    for (const e of enrichedEntries) {
      if (isGrandfathered(e.facts?.closedAt) || isGrandfathered(e.facts?.mergedAt)) {
        preEnforcement.add(e.iterationSlug)
      }
    }
  }

  const failures: CheckFailure[] = []
  for (const e of entries) {
    if (!e.archived && e.task.issue === null) {
      // Branch-scope: in CI for a specific iteration, only check that iteration.
      if (ciIterationSlug && e.iterationSlug !== ciIterationSlug) continue

      if (forgeUnavailableSlugs?.has(e.iterationSlug)) {
        failures.push({
          issue: null,
          iteration: e.iterationSlug,
          task: e.task.id,
          reason: `Task ${e.task.id} in active iteration has no Issue ref (#TBD or empty), but forge data for iteration "${e.iterationSlug}" was unavailable — cannot evaluate grandfather status, not silently failed`,
          grandfathered: true
        })
        continue
      }

      failures.push({
        issue: null,
        iteration: e.iterationSlug,
        task: e.task.id,
        reason: `Task ${e.task.id} in active iteration has no Issue ref (#TBD or empty) — D-055 requires all active tasks to have Issue numbers`,
        grandfathered: preEnforcement.has(e.iterationSlug)
      })
    }
  }
  const activeFails = failures.filter((f) => !f.grandfathered)
  const status = activeFails.length > 0 ? 'fail' : failures.length > 0 ? 'info' : 'pass'
  return {
    check: 'T3',
    status,
    failures,
    note: status === 'info' ? `${failures.length} grandfathered (pre-${COHERENCE_ENFORCED_FROM})` : undefined
  }
}

/**
 * D1: A task with an open PR has all `depends-on` Issues closed.
 * Fail class: `dispatched-on-unmet-deps`
 *
 * `issueToEntry`: Map from issue number → TaskEntry, for resolving `#NNN`
 * style depends-on refs in addition to task-ID style refs.
 * `taskToEntry`: Map from `${slug}/${taskId}` → TaskEntry for same-iteration refs.
 */
export function checkD1(
  entries: TaskEntry[],
  issueToEntry: Map<number, TaskEntry>,
  taskToEntry: Map<string, TaskEntry>
): CheckResult {
  const failures: CheckFailure[] = []
  for (const e of entries) {
    if (!e.facts) continue
    if (e.facts.prState !== 'open') continue

    for (const dep of e.task.dependsOn) {
      const depEntry = resolveDepEntry(dep, e.iterationSlug, issueToEntry, taskToEntry)
      if (!depEntry) continue // unknown dep — not a D1 concern

      const depFacts = depEntry.facts
      const depClosed = depFacts?.issueState === 'closed'
      if (!depClosed) {
        failures.push({
          issue: e.task.issue,
          iteration: e.iterationSlug,
          task: e.task.id,
          reason: `Task has open PR but depends-on ${dep} (issue #${depEntry.task.issue ?? '?'}) is not closed`
        })
      }
    }
  }
  return { check: 'D1', status: failures.length > 0 ? 'fail' : 'pass', failures }
}

function resolveDepEntry(
  dep: string,
  iterationSlug: string,
  issueToEntry: Map<number, TaskEntry>,
  taskToEntry: Map<string, TaskEntry>
): TaskEntry | undefined {
  // `#NNN` style — resolve by issue number
  const issueMatch = dep.match(/^#(\d+)$/)
  if (issueMatch?.[1]) return issueToEntry.get(Number(issueMatch[1]))
  // Task-ID style — resolve within same iteration first, then globally
  return taskToEntry.get(`${iterationSlug}/${dep}`) ?? taskToEntry.get(dep)
}

/** An open Issue's forge-fetched body + labels, as returned by the batched label query. */
export type ForgeIssue = { number: number; body: string; labels: string[] }

/**
 * R1: Every active-iteration task Issue's body carries the full eight-field
 * Planner's rationale (D-078, `aeg-root/contracts/planner-brief.md`).
 * Fail class: `missing-rationale-field`
 *
 * Presence-only — delegates entirely to `checkIssueRationale` (the same
 * grammar/parser `bin/open-issue.ts` enforces at ring 0 on new/edited
 * Issues). This is the ring-1/2 half: continuous re-checking of the stock.
 * One grammar, one parser (D-078) — this function does not re-implement it.
 *
 * `issuesBySlug`: open Issues per active iteration slug, from the same
 * batched label-scoped query T2 uses (`fetchOpenIssuesByLabel`), extended to
 * carry `body` + `labels`.
 * `grandfatheredIssues`: `R1_GRANDFATHERED_ISSUES` — pre-D-078 stock,
 * reported as `info`, never `fail`.
 */
export function checkR1(
  issuesBySlug: Map<string, ForgeIssue[]>,
  grandfatheredIssues: ReadonlySet<number>
): CheckResult {
  const failures: CheckFailure[] = []
  for (const [slug, issues] of issuesBySlug) {
    for (const issue of issues) {
      if (!isTaskIssueLabelSet(issue.labels)) continue
      const { status, errors } = checkIssueRationale(issue.body)
      if (status !== 'fail') continue
      failures.push({
        issue: issue.number,
        iteration: slug,
        reason: `Issue #${issue.number} fails the D-078 rationale gate: ${errors.join(' | ')}`,
        grandfathered: grandfatheredIssues.has(issue.number)
      })
    }
  }
  const activeFails = failures.filter((f) => !f.grandfathered)
  const status = activeFails.length > 0 ? 'fail' : failures.length > 0 ? 'info' : 'pass'
  return {
    check: 'R1',
    status,
    failures,
    note:
      status === 'info'
        ? `${failures.length} grandfathered task Issue(s) predate the D-078 rationale grammar`
        : undefined
  }
}

/**
 * L1: Active iteration with zero open task-Issues → should be archived.
 * Fail class: `stale-active-iteration`
 *
 * An active iteration (file not in completed/) where every task with a
 * known issue has `issueState === 'closed'`.
 */
export function checkL1(files: IterationFile[], entriesBySlug: Map<string, TaskEntry[]>): CheckResult {
  const failures: CheckFailure[] = []
  for (const f of files) {
    if (f.archived) continue
    const entries = entriesBySlug.get(f.slug) ?? []
    const withFacts = entries.filter((e) => e.facts !== undefined)
    if (withFacts.length === 0) continue // forge unavailable or no tasks with issues
    const allClosed = withFacts.every((e) => e.facts?.issueState === 'closed')
    if (allClosed) {
      failures.push({
        iteration: f.slug,
        reason: 'Active iteration has no open task-Issues — consider archiving to completed/'
      })
    }
  }
  return { check: 'L1', status: failures.length > 0 ? 'fail' : 'pass', failures }
}

/**
 * L2: Archived iteration with any open task-Issue → premature archive.
 * **Advisory (info-only)** per `state-machine.md` §12 (L1/L2 are lifecycle-hygiene
 * signals, not the done-lifecycle gate). Findings are surfaced for a human to
 * investigate; they never fail CI. Only A1/A2/A3/N1/M1/M3 block.
 */
export function checkL2(files: IterationFile[], entriesBySlug: Map<string, TaskEntry[]>): CheckResult {
  const failures: CheckFailure[] = []
  for (const f of files) {
    if (!f.archived) continue
    const entries = entriesBySlug.get(f.slug) ?? []
    for (const e of entries) {
      if (!e.facts) continue
      if (e.facts.issueState === 'open') {
        failures.push({
          issue: e.task.issue,
          iteration: f.slug,
          task: e.task.id,
          reason: `Archived iteration has open task-Issue #${e.task.issue ?? '?'} (premature archive)`
        })
      }
    }
  }
  return {
    check: 'L2',
    status: 'info',
    failures,
    note:
      failures.length > 0
        ? `${failures.length} archived iteration(s) with an open task-Issue — investigate (advisory)`
        : undefined
  }
}

/**
 * L3: Count of active iterations — informational only, does not affect exit code.
 */
export function checkL3(files: IterationFile[]): CheckResult {
  const active = files.filter((f) => !f.archived)
  return {
    check: 'L3',
    status: 'info',
    failures: [],
    note: `${active.length} active iteration(s): ${active.map((f) => f.slug).join(', ') || '(none)'}`
  }
}

/**
 * Closes #N gate — Layer 1 of D-069's forge-lifecycle enforcement.
 *
 * A task PR (branch `task/<iter>/<n>`) must carry `Closes #<its-issue>` in
 * the body. Non-task branches are silently bypassed (returns ok:true).
 *
 * Pure function; reads from injected parameters. The CLI entry-point wires
 * in BRANCH + PR_BODY env vars.
 */
export function checkClosesN(
  branch: string,
  prBody: string,
  iterationFiles: IterationFile[]
): { ok: boolean; message?: string; expectedIssue?: number } {
  const m = branch.match(/^task\/([^/]+)\/([^/]+)$/)
  if (!m) return { ok: true } // non-task branch — bypass

  const iterSlug = m[1] as string
  const taskId = m[2] as string

  const iterFile = iterationFiles.find((f) => f.slug === iterSlug)
  if (!iterFile) {
    return {
      ok: false,
      message: `closes-n: branch "${branch}" references iteration "${iterSlug}" but no topology file found at aeg-root/iterations/${iterSlug}.md. Ensure the iteration file exists before opening the PR.`
    }
  }

  const task = iterFile.iteration.tasks.find((t) => t.id === taskId)
  if (!task) {
    return {
      ok: false,
      message: `closes-n: branch "${branch}" references task "${taskId}" not found in ${iterSlug} topology. Verify the task ID matches the iteration file.`
    }
  }

  if (task.issue === null) {
    return {
      ok: false,
      message: `closes-n: task "${taskId}" in "${iterSlug}" has no Issue number (#TBD). The Planner must cut the Issue before this PR can be validated.`
    }
  }

  const expectedIssue = task.issue
  const closesPattern = /(?:closes|close|fixes|fix|resolves|resolve)\s*:?\s*#(\d+)/gi
  // When the body carries an AEG:CLOSES anchor pair (anchored-region.ts,
  // task 30), only references inside the pair count — a Closes-shaped line in
  // a pasted reference brief is ignored. No pair → whole body, as before.
  const searchIn = anchoredRegion(prBody, 'CLOSES') ?? prBody
  const referenced = new Set<number>()
  for (const hit of searchIn.matchAll(closesPattern)) {
    referenced.add(Number(hit[1]))
  }

  if (!referenced.has(expectedIssue)) {
    return {
      ok: false,
      expectedIssue,
      message: `closes-n: PR body does not contain \`Closes #${expectedIssue}\` (required for task "${taskId}" in iteration "${iterSlug}"). Add it to the PR body Summary section.`
    }
  }

  return { ok: true, expectedIssue }
}
