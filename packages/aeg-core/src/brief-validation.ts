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

export type BriefSectionResult = { status: 'pass' | 'fail'; errors: string[] }

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
    checkClosesN(prBody),
    checkLockAck(prBody, touchesLock)
  ]
  return { errors: results.flatMap((r) => r.errors) }
}
