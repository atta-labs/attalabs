/**
 * Brief→Developer brief-validation grammar (aeg-governance-hardening
 * task 2). Pure — no `fs`, no `fetch`, no `process.env`. The CLI shim
 * (`bin/verify-brief.ts`) reads `PR_BODY`, then
 * calls `checkBriefSections`.
 *
 * Scope is presence-only (per the Planner's trap): this gate cannot judge
 * whether a Test Plan item is truly scriptable, whether `unit-tests-only` is
 * justified by the surface map, or whether a doc-update entry is factually
 * correct — those remain Reviewer + Verification judgment. It only confirms each
 * required brief section exists in the PR body, in the shape the
 * `brief-authoring` skill and `brief-developer` contract define.
 */

import { type AnchorField, anchoredRegion, stripCode } from './anchored-region'
import { parsePremiseBlock } from './premise-check'

export type BriefSectionResult = { status: 'pass' | 'fail'; errors: string[] }

/**
 * The PR body's header block: everything before the first h2+ heading. The
 * canonical PR-body form (`roles/developer.md`) puts the metadata fields
 * (Tier, For, Project, Closes) at the top, before `## Summary`.
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
 *
 * When `anchor` is given and the body carries that anchor pair
 * (`anchored-region.ts`, task 30), the pair replaces the header region as the
 * one place the field is read from — a field-shaped line anywhere else in the
 * body is ignored. Bodies without the pair parse exactly as before.
 */
function headerField(prBody: string, labelPattern: string, anchor?: AnchorField): string | null {
  const anchored = anchor !== undefined ? anchoredRegion(prBody, anchor) : null
  const region = anchored ?? headerRegion(prBody)
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
 * The `unit-tests-only` sentinel, tolerating the markdown emphasis every other
 * brief field carries (`**Tier:**`, `**Project:**`, …). All three of
 * `Test Plan: unit-tests-only`, `**Test Plan:** unit-tests-only` and
 * `**Test Plan**: unit-tests-only` match.
 *
 * The bold forms used to fail: the pattern was `/Test Plan\s*:\s*unit-tests-only/i`,
 * and `\s*` cannot cross the `**` sitting between the colon and the value — so
 * `brief-authoring/SKILL.md` §9's own canonical example (`**Test Plan:** unit-tests-only`)
 * was rejected by the gate that documents it, and any brief copying the skill
 * verbatim bounced. Two checks read this sentinel and both were wrong in
 * different directions: `checkTestPlan` false-FAILED a well-formed brief, while
 * `checkTestPlanExclusivity` silently false-PASSED a self-contradictory one (a
 * bolded `unit-tests-only` **plus** tagged checkboxes never tripped it, because
 * its own guard clause never matched either) — the exact combination that guard
 * was built for in #340. Fixing the doc instead of the pattern was rejected:
 * bold is the house convention for brief fields, so an unbolded Test Plan is the
 * odd one out and drifts back the moment someone tidies it.
 */
const TEST_PLAN_UNIT_TESTS_ONLY_RE = /(?:\*\*)?Test Plan(?:\*\*)?\s*:\s*(?:\*\*)?\s*unit-tests-only/i

/**
 * Test Plan — pass iff the body contains the `Test Plan: unit-tests-only`
 * sentinel (bolded or not — see `TEST_PLAN_UNIT_TESTS_ONLY_RE`), OR at least one
 * `**[agent]**`/`**[principal]**`-tagged checklist line. Presence-only: does not
 * judge whether tags are correctly assigned or whether `unit-tests-only` is
 * justified by the surface map.
 */
export function checkTestPlan(prBody: string): BriefSectionResult {
  if (TEST_PLAN_UNIT_TESTS_ONLY_RE.test(prBody)) return { status: 'pass', errors: [] }
  if (/\*\*\[(?:agent|principal)\]\*\*/.test(prBody)) return { status: 'pass', errors: [] }
  return {
    status: 'fail',
    errors: [
      'brief-validation Test Plan: no Test Plan section found — expected `Test Plan: unit-tests-only`, or at least one `**[agent]**`/`**[principal]**`-tagged checklist item.'
    ]
  }
}

/**
 * Test Plan shape guard (aeg-governance-hardening task 20 follow-up, #340) —
 * `Test Plan: unit-tests-only` and a tagged checkbox item are mutually
 * exclusive per brief-authoring §9 ("The two fields are coupled; Brief
 * Validation cross-checks them"): `unit-tests-only` declares there is no
 * checklist because there is nothing runtime to check off, so a body
 * carrying both is self-contradictory. Regression source: PR #363's own
 * original brief declared `unit-tests-only` while its Test Plan also listed
 * `- [x]`/`- [ ]` `[agent]`/`[principal]` items — a combination this gate
 * previously let through.
 */
export function checkTestPlanExclusivity(prBody: string): BriefSectionResult {
  if (!TEST_PLAN_UNIT_TESTS_ONLY_RE.test(prBody)) return { status: 'pass', errors: [] }
  if (/^-\s*\[[ xX]\]\s*\*{2}\[(?:agent|principal)\]\*{2}/im.test(prBody)) {
    return {
      status: 'fail',
      errors: [
        'brief-validation Test Plan shape: `Test Plan: unit-tests-only` and a `- [ ]`/`- [x]` tagged checkbox item are mutually exclusive (brief-authoring §9) — declare one form, not both.'
      ]
    }
  }
  return { status: 'pass', errors: [] }
}

/**
 * Principal-placeholder guard (aeg-governance-hardening task 20 follow-up,
 * #340) — a `**[principal]**` checkbox item whose content is a
 * none-placeholder ("None — …") is untickable by construction: nobody can
 * check a box asserting there is nothing to verify, so it blocks the merge
 * gate forever. If a brief genuinely has no principal-runnable surface, the
 * item must be omitted entirely, not declared and left permanently unticked.
 */
export function checkPrincipalPlaceholder(prBody: string): BriefSectionResult {
  const lineRe = /^-\s*\[[ xX]\]\s*\*{2}\[principal\]\*{2}(.*)$/gim
  for (const m of prBody.matchAll(lineRe)) {
    const content = m[1] ?? ''
    if (/^\s*None\b/i.test(content)) {
      return {
        status: 'fail',
        errors: [
          'brief-validation Test Plan shape: a `**[principal]**` checkbox item is a "None" placeholder — if there is no principal-runnable surface, omit the item entirely; an untickable placeholder box blocks the merge gate forever.'
        ]
      }
    }
  }
  return { status: 'pass', errors: [] }
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
  if (headerField(prBody, 'Project(?:\\(s\\))?', 'PROJECT') !== null) return { status: 'pass', errors: [] }
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

/**
 * `Closes #N` gate — the match runs on **code-stripped** body text (fenced
 * blocks + inline spans removed via `stripCode`), so it agrees byte-for-byte
 * with GitHub's own auto-close parser, which also ignores `Closes #N` inside
 * code. Without the strip, a body whose only closing reference is backticked
 * (`` `Closes #600` ``) passed this gate green yet merged **without** closing
 * its Issue — stranding #600 (PR #608) and #601 (PR #611) and reddening every
 * open PR via the A3 `auto-close-misfire` oracle. "verify-docs green" must
 * imply "GitHub will auto-close"; stripping code here is what makes it so.
 *
 * The separator groups are **bounded** (`\s{0,8}`, not `\s*`). Two adjacent
 * unbounded `\s*` around an optional `:` backtrack quadratically on a body of
 * the shape `closes` + long whitespace + no `#` — ~2.65 s at GitHub's
 * 65,536-char body cap, and this function runs the pattern twice on the fail
 * path (PR #617 security pass). A constant bound makes the work per start
 * position constant, so the scan is linear in body length. Eight is far past
 * any real separator; a body needing more is malformed by the brief's own
 * convention (a bare ref inside the `AEG:CLOSES` anchor) and fails with an
 * actionable message rather than silently stranding its Issue.
 */
export function checkClosesN(prBody: string): BriefSectionResult {
  const closesPattern = /(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s{0,8}:?\s{0,8}#\d+/i
  if (closesPattern.test(stripCode(prBody))) {
    return { status: 'pass', errors: [] }
  }
  // Distinguish "only inside code" (actionable — move it out) from "absent entirely".
  if (closesPattern.test(prBody)) {
    return {
      status: 'fail',
      errors: [
        "brief-validation Closes #N: `Closes #N` found only inside a code span — GitHub won't auto-close it. Put a bare `Closes #N` on its own line inside the `AEG:CLOSES` anchor."
      ]
    }
  }
  return {
    status: 'fail',
    errors: ['brief-validation Closes #N: no `Closes #<N>` (or Fixes/Resolves) reference found in the PR body.']
  }
}

/**
 * Forge-title grammar — the two title forms this repo actually uses:
 *   1. Commit-style: `Type: description` or `Type(scope): description`, with
 *      the commitlint type set plus `Plan` (plan PRs).
 *   2. Task-style: `[tranche] id — description` (task Issues and task PRs).
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
      `brief-validation title: "${title}" matches neither title grammar — expected \`Type: description\` / \`Type(scope): description\` (commitlint types + Plan) or \`[tranche] id — description\` (task form).`
    ]
  }
}

/**
 * Plan-PR Closes guard — a `plan/*` PR body must never carry a
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
      'brief-validation plan-PR guard: a `plan/*` PR must not carry `Closes #N` — a plan PR creates Issues, it does not resolve one (roles/planner.md). Remove the `Closes #N` reference; the task Issue closes from the task PR that does the work.'
    ]
  }
}

/**
 * The four markers that make a body *a brief* rather than an ordinary PR
 * description. Each is an existing section detector, reused unchanged — so a
 * body that trips this detector is, by construction, a body the section checks
 * were written to grade.
 *
 * Test Plan is deliberately **not** a marker even though it is a required brief
 * section: the canonical PR-body template gives every AEG PR a Test plan with
 * `**[agent]**` tags, so it is the one section an ordinary non-brief PR
 * plausibly carries. The four kept here are brief grammar and nothing else — a
 * dependency bump has none of them, and needing *two* means one stray phrase
 * can never force a brief onto a PR that was never meant to carry one.
 */
const BRIEF_SHAPE_MARKERS = [checkSurfaceMap, checkDocUpdateList, checkStopConditions, checkAutonomyClause] as const

/**
 * Is this PR body a brief? — the predicate that replaces the branch name as
 * `verify-brief`'s trigger for running `checkBriefSections`.
 *
 * The old rule was "validate iff the branch is `task/<tranche>/<n>`", which meant a
 * standalone `fix/*` brief bypassed **every** section check. Confirmed live: a
 * fix brief on `fix/studio-tranche-href` shipped with no §7
 * documentation-update list, and `checkDocUpdateList` — the checker that exists
 * for exactly that — never ran, because the branch wasn't a task branch. The
 * exemption still has to exist (an ordinary one-line dependency-bump PR has no
 * brief and must not be forced to grow one), so the rule becomes: *if a body is
 * a brief, it must be a complete brief, whatever the branch is called.*
 *
 * Detection runs on `stripCode(prBody)` (the single shared stripper from
 * `anchored-region`, per #617's "one stripper, never a duplicated regex"). A PR
 * that *quotes* a brief inside a fence — "here's a sample brief: ``` …Technical
 * surface map… ```" — is discussing a brief, not carrying one, and must stay
 * exempt; matching on raw text would force-validate it. Note this also rules out
 * the worktree `git worktree add … -b` line as a marker: Step 0 lives inside a
 * fence in every real brief, so it never survives the strip.
 *
 * Threshold is ≥2 of four rather than any-one so that a brief missing one
 * section is still detected as a brief — the failure mode this gate exists to
 * catch. The `fix/studio-tranche-href` body trips three with §7 absent.
 */
export function isBriefShaped(prBody: string): boolean {
  const stripped = stripCode(prBody)
  return BRIEF_SHAPE_MARKERS.filter((check) => check(stripped).status === 'pass').length >= 2
}

/**
 * The branch a brief declares for itself, read from its Step 0 command. At
 * authoring time there is no `BRANCH` env var and no branch yet — but every
 * brief carries `git worktree add <path> -b <branch> origin/main`, so the brief
 * states what it is going to be, and `verify-brief --body-file` can grade it as
 * that. Matched on the RAW body, not `stripCode`'s output: Step 0 lives inside a
 * fence in every real brief, so the stripped text never contains it.
 */
export function inferBranchFromBody(prBody: string): string {
  const m = prBody.match(/git worktree add\s+\S+\s+-b\s+(\S+)/)
  return m?.[1] ?? ''
}

/** Composition knobs for `checkBriefSections` — see each field. */
export type BriefSectionsOptions = {
  /**
   * Whether a `Closes #N` reference is required. Defaults to `true` (every
   * existing caller keeps today's behavior).
   *
   * A task PR must close its Issue, so `verify-brief` leaves this on for
   * `task/<tranche>/<n>`. A brief-shaped body on a non-task branch must not: a
   * standalone fix brief has no task Issue to close, and a `plan/*` PR is
   * *forbidden* to carry `Closes #N` by `checkPlanPrNoCloses` — so
   * requiring it there would make the two gates jointly unsatisfiable. Issue
   * linkage is a task-branch obligation; brief completeness is not.
   */
  requireClosesN?: boolean
}

/**
 * Aggregates every section detector into one combined result — one error
 * line per failing section, mirroring `doc-owners.ts`'s `parseDocOwners`
 * error-message style.
 */
export function checkBriefSections(
  prBody: string,
  readTier: (body: string) => 0 | 1 | 3 | null,
  options: BriefSectionsOptions = {}
): { errors: string[] } {
  const { requireClosesN = true } = options
  const results = [
    checkTierField(prBody, readTier),
    checkTestPlan(prBody),
    checkTestPlanExclusivity(prBody),
    checkPrincipalPlaceholder(prBody),
    checkSurfaceMap(prBody),
    checkDocUpdateList(prBody),
    checkWorktreeStep0(prBody),
    checkStopConditions(prBody),
    checkAutonomyClause(prBody),
    checkProjectField(prBody),
    checkForField(prBody),
    ...(requireClosesN ? [checkClosesN(prBody)] : [])
  ]
  return { errors: results.flatMap((r) => r.errors) }
}
