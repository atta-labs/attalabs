/**
 * Brief→Developer brief-validation grammar (D-069, aeg-governance-hardening
 * task 2). Pure — no `fs`, no `fetch`, no `process.env`. The CLI shim
 * (`bin/verify-brief.ts`) reads `PR_BODY` and derives `touchesLock`, then
 * calls `checkBriefSections`.
 *
 * Scope is presence-only (per the Planner's trap): this gate cannot judge
 * whether a Test Plan item is truly scriptable, whether `unit-tests-only` is
 * justified by the surface map, or whether a doc-update entry is factually
 * correct — those remain Reviewer + Verifier judgment. It only confirms each
 * required brief section exists in the PR body, in the shape the
 * `brief-authoring` skill and `brief-developer` contract define.
 */

import { parsePremiseBlock } from './premise-check'

export type BriefSectionResult = { status: 'pass' | 'fail'; errors: string[] }

/**
 * The PR body's header block: everything before the first h2+ heading. The
 * canonical PR-body form (`roles/developer.md`) puts the metadata fields
 * (Tier, For, Project, Closes, lock-ack) at the top, before `## Summary`.
 * Anchoring field extraction here — shared with `archive-task.ts` — is what
 * stops prose in later sections that merely *mentions* a field name (e.g. a
 * "Decisions made" paragraph discussing the `Ticket:` field) from being
 * parsed as the field itself. Regression from #311's first live archivist
 * run, where exactly that happened.
 */
export function headerRegion(prBody: string): string {
  const m = prBody.match(/^##\s/m)
  return m?.index !== undefined ? prBody.slice(0, m.index) : prBody
}

/**
 * Tolerant header-field reader: accepts `Field: value` and `**Field:** value`,
 * line-anchored, searched only in the header region. Stops at line end or a
 * `·` metadata separator.
 */
function headerField(prBody: string, labelPattern: string): string | null {
  const region = headerRegion(prBody)
  const re = new RegExp(`^(?:\\*\\*)?\\s*${labelPattern}\\s*(?:\\*\\*)?\\s*:\\s*(?:\\*\\*)?\\s*([^\\n·]+)`, 'im')
  const m = region.match(re)
  if (!m) return null
  const value = (m[1] as string).trim()
  return value.length > 0 ? value : null
}

/** Strips markdown emphasis markers and collapses whitespace, for tolerant phrase matching. */
function normalize(text: string): string {
  return text.replace(/[*_]/g, '').replace(/\s+/g, ' ')
}

function headingCheck(prBody: string, keywordPattern: string, sectionName: string): BriefSectionResult {
  const re = new RegExp(`^#{1,4}\\s*(?:\\*\\*)?(?:\\d+[a-z]?\\.\\s*)?[^\\n]*${keywordPattern}`, 'im')
  if (re.test(prBody)) return { status: 'pass', errors: [] }
  return {
    status: 'fail',
    errors: [`brief-validation ${sectionName}: no "${sectionName}" section found in the PR body.`]
  }
}

/** Tier field — reuses the canonical `@atta/aeg-core` parser (do not re-implement). */
export function checkTierField(prBody: string, readTier: (body: string) => 0 | 1 | 3 | null): BriefSectionResult {
  if (readTier(prBody) !== null) return { status: 'pass', errors: [] }
  return {
    status: 'fail',
    errors: [
      'brief-validation tier: no `Tier:` field found in the PR body (expected `Tier: 0|1|3` or `**Tier:** 0|1|3`).'
    ]
  }
}

/**
 * Test Plan — pass iff the body contains the literal `Test Plan: unit-tests-only`
 * sentinel, OR at least one `**[agent]**`/`**[principal]**`-tagged checklist line.
 * Presence-only: does not judge whether tags are correctly assigned or whether
 * `unit-tests-only` is justified by the surface map.
 */
export function checkTestPlan(prBody: string): BriefSectionResult {
  if (/Test Plan\s*:\s*unit-tests-only/i.test(prBody)) return { status: 'pass', errors: [] }
  if (/\*\*\[(?:agent|principal)\]\*\*/.test(prBody)) return { status: 'pass', errors: [] }
  return {
    status: 'fail',
    errors: [
      'brief-validation Test Plan: no Test Plan section found — expected `Test Plan: unit-tests-only`, or at least one `**[agent]**`/`**[principal]**`-tagged checklist item.'
    ]
  }
}

/**
 * Premise coverage (this task, aeg-governance-hardening 11, #324) — pass iff
 * either (a) at least one `Premise:` assertion's path matches a file in
 * `surfaceFiles` (the §4 surface map's file list — in practice, the PR's
 * actual changed-file list, the same diff-derived-truth philosophy
 * `deriveTierFromDiff` already uses), or (b) `surfaceFiles` is empty (a
 * Tier 0 brief with zero runtime/code surface has nothing to pin — mirrors
 * `checkTestPlan`'s `unit-tests-only` exemption). Presence-only: does not
 * judge whether the pinned premise is the *right* one to have pinned.
 */
export function checkPremiseCoverage(prBody: string, surfaceFiles: string[]): BriefSectionResult {
  if (surfaceFiles.length === 0) return { status: 'pass', errors: [] }
  const assertions = parsePremiseBlock(prBody)
  if (assertions.some((a) => surfaceFiles.includes(a.path))) return { status: 'pass', errors: [] }
  return {
    status: 'fail',
    errors: [
      'brief-validation Premise: no `Premise:` assertion found whose path matches a file in the surface map — a brief with a real code surface must pin at least one premise (aeg-governance-hardening task 11).'
    ]
  }
}

export function checkSurfaceMap(prBody: string): BriefSectionResult {
  return headingCheck(prBody, '(?:technical\\s+)?surface map', 'Technical surface map')
}

export function checkDocUpdateList(prBody: string): BriefSectionResult {
  return headingCheck(prBody, '(?:documentation|doc)[- ]update(?:\\s+list)?', 'Documentation-update list')
}

export function checkWorktreeStep0(prBody: string): BriefSectionResult {
  if (/git worktree add/.test(prBody)) return { status: 'pass', errors: [] }
  return {
    status: 'fail',
    errors: ['brief-validation worktree Step 0: no `git worktree add` command found in the PR body.']
  }
}

export function checkStopConditions(prBody: string): BriefSectionResult {
  return headingCheck(prBody, 'stop conditions', 'Stop conditions')
}

/**
 * Autonomy clause — matches the standing clause's core phrase, case-insensitively,
 * tolerant of whitespace and emphasis markup (`**Autonomy:**` vs `Autonomy:`).
 * Per the Planner's trap, this is deliberately verbatim-ish rather than a loose
 * "mentions autonomy somewhere" match — the phrase is the actual invariant.
 */
export function checkAutonomyClause(prBody: string): BriefSectionResult {
  const normalized = normalize(prBody).toLowerCase()
  if (/do not stop to ask clarifying questions/.test(normalized)) return { status: 'pass', errors: [] }
  return {
    status: 'fail',
    errors: [
      'brief-validation autonomy clause: the standing autonomy clause ("Do not stop to ask clarifying questions...") was not found in the PR body.'
    ]
  }
}

/**
 * Project field — required in a multi-project repo (`brief-authoring` skill,
 * `planner-brief` contract: the field routes the Developer to the right specs
 * and tells the Reviewer whose behavior to verify). Must appear in the header
 * block, where the Archivist's provenance assembly also reads it — gate and
 * archivist share `headerRegion`, so a body that passes this gate can never
 * produce a DANGLING Project field in provenance. Added after #311 merged
 * without it: the Developer satisfied exactly the sections this gate checked
 * and dropped everything it didn't — whatever the gate doesn't enforce, agents
 * will eventually omit (contract-gate parity is the fix, not discipline).
 */
export function checkProjectField(prBody: string): BriefSectionResult {
  if (headerField(prBody, 'Project(?:\\(s\\))?') !== null) return { status: 'pass', errors: [] }
  return {
    status: 'fail',
    errors: [
      'brief-validation Project: no `Project:` field found in the PR body header block (before the first `##` heading). Required per the brief-developer contract — expected `Project: <name>[, <name>]` or `**Project:** …`.'
    ]
  }
}

/**
 * For/model field — the brief's mandatory `For:` header (`brief-authoring`
 * skill: "the `For:` + `Reason:` lines are mandatory"). AEG forbids
 * commit-trailer attribution, so this line is the provenance block's only
 * source for Model/agent — same headerRegion parity rationale as
 * `checkProjectField`.
 */
export function checkForField(prBody: string): BriefSectionResult {
  if (headerField(prBody, 'For') !== null) return { status: 'pass', errors: [] }
  return {
    status: 'fail',
    errors: [
      'brief-validation For: no `For:` field found in the PR body header block (before the first `##` heading). Required per the brief-authoring skill — expected `For: <model + environment>` or `**For:** …`.'
    ]
  }
}

export function checkClosesN(prBody: string): BriefSectionResult {
  if (/(?:closes|close|fixes|fix|resolves|resolve)\s*:?\s*#\d+/i.test(prBody)) {
    return { status: 'pass', errors: [] }
  }
  return {
    status: 'fail',
    errors: ['brief-validation Closes #N: no `Closes #<N>` (or Fixes/Resolves) reference found in the PR body.']
  }
}

/**
 * Lock-ack — pass trivially when the diff doesn't touch a `Lock: YES` decision.
 * Otherwise require `Conforms to lock: D-###` or `Challenges lock: D-###`; the
 * challenge form additionally requires a `**Rationale:**` field. This is the
 * format this task defines (none existed before) — see `brief-developer.md`.
 */
export function checkLockAck(prBody: string, touchesLock: boolean): BriefSectionResult {
  if (!touchesLock) return { status: 'pass', errors: [] }

  const conforms = /\*{0,2}\s*Conforms to lock\s*:\*{0,2}\s*D-\d+/i.test(prBody)
  if (conforms) return { status: 'pass', errors: [] }

  const challenges = /\*{0,2}\s*Challenges lock\s*:\*{0,2}\s*D-\d+/i.test(prBody)
  if (challenges) {
    const hasRationale = /\*{0,2}\s*Rationale\s*:\*{0,2}/i.test(prBody)
    if (hasRationale) return { status: 'pass', errors: [] }
    return {
      status: 'fail',
      errors: [
        'brief-validation lock-ack: `Challenges lock: D-###` found but no `**Rationale:**` field accompanies it.'
      ]
    }
  }

  return {
    status: 'fail',
    errors: [
      'brief-validation lock-ack: this PR touches a `Lock: YES` decision but has no `Conforms to lock: D-###` or `Challenges lock: D-###` field.'
    ]
  }
}

/**
 * Forge-title grammar (D-078) — the two title forms this repo actually uses:
 *   1. Commit-style: `Type: description` or `Type(scope): description`, with
 *      the commitlint type set plus `Plan` (plan PRs).
 *   2. Task-style: `[iteration] id — description` (task Issues and task PRs).
 * Anything else is refused: titles ride into merge commits and the forge's
 * derived views, so they carry the same grammar obligation as commit messages
 * (husky/commitlint parity, applied at the wrapper).
 */
export function checkForgeTitle(title: string): BriefSectionResult {
  const commitStyle = /^(Build|Chore|Docs|Feat|Fix|Perf|Plan|Refactor|Revert|Style|Test)(\([a-z0-9-]+\))?: \S/
  const taskStyle = /^\[[a-z0-9._-]+\] \S+ — \S/
  if (commitStyle.test(title) || taskStyle.test(title)) return { status: 'pass', errors: [] }
  return {
    status: 'fail',
    errors: [
      `brief-validation title: "${title}" matches neither title grammar — expected \`Type: description\` / \`Type(scope): description\` (commitlint types + Plan) or \`[iteration] id — description\` (task form).`
    ]
  }
}

/**
 * Plan-PR Closes guard (D-077) — a `plan/*` PR body must never carry a
 * `Closes #N` reference. Three confirmed live incidents (#294→#293,
 * #298→#297, #288→#287) show a plan PR's `Closes #N` prematurely closing
 * the task Issue when the *plan* merged — before the task itself ever ran.
 * `roles/planner.md`'s Plan-PR close-out section already forbids this in
 * prose ("a plan PR creates Issues; it does not resolve one"); this is the
 * mechanical gate. Separate from `checkBriefSections` (it needs the branch,
 * not just the body, and it's a guard against a forbidden shape, not a
 * presence check) — the shim runs it before the non-task-branch bypass, since
 * a `plan/*` branch would otherwise never reach a brief-shape check at all.
 * Plan branches without `Closes` continue to bypass, as today.
 */
export function checkPlanPrNoCloses(branch: string, prBody: string): BriefSectionResult {
  if (!branch.startsWith('plan/')) return { status: 'pass', errors: [] }
  if (!/\bcloses\s+#\d+/i.test(prBody)) return { status: 'pass', errors: [] }
  return {
    status: 'fail',
    errors: [
      'brief-validation plan-PR guard: a `plan/*` PR must not carry `Closes #N` — a plan PR creates Issues, it does not resolve one (roles/planner.md, D-077). Remove the `Closes #N` reference; the task Issue closes from the task PR that does the work.'
    ]
  }
}

/**
 * Aggregates every section detector into one combined result — one error
 * line per failing section, mirroring `doc-owners.ts`'s `parseDocOwners`
 * error-message style.
 */
export function checkBriefSections(
  prBody: string,
  touchesLock: boolean,
  readTier: (body: string) => 0 | 1 | 3 | null
): { errors: string[] } {
  const results = [
    checkTierField(prBody, readTier),
    checkTestPlan(prBody),
    checkSurfaceMap(prBody),
    checkDocUpdateList(prBody),
    checkWorktreeStep0(prBody),
    checkStopConditions(prBody),
    checkAutonomyClause(prBody),
    checkProjectField(prBody),
    checkForField(prBody),
    checkClosesN(prBody),
    checkLockAck(prBody, touchesLock)
  ]
  return { errors: results.flatMap((r) => r.errors) }
}
