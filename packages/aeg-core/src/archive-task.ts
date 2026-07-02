/**
 * Post-merge Archivist provenance assembly (D-077, aeg-governance-hardening
 * task 5d, #309). Pure — no `fs`, no `fetch`, no `process.env`. The CLI shim
 * (`bin/archive-task.ts`) resolves the merged PR via `gh`, gathers
 * `MergedPrFacts`, and calls these functions.
 *
 * The cardinal constraint (`aeg-root/roles/archivist.md`): ASSEMBLE, never
 * author. Every provenance field is copied from a fact the merge already
 * froze — the PR body, PR metadata, or PR comments. A field whose source
 * fact is absent becomes a DANGLING entry, never an inferred or defaulted
 * value. Field/heading shapes below mirror the live provenance comments
 * posted by hand on PRs #302/#305/#306.
 */

import { readTierFromPrBody } from './pr-tier'

export type MergedPrFacts = {
  number: number
  headRefName: string
  body: string
  mergedAt: string
  mergeSha: string
  comments: string[]
}

const TASK_BRANCH_PATTERN = /^task\/([^/]+)\/([^/]+)$/

/** null when headRefName is not task/<iteration>/<taskId> */
export function taskRefFromBranch(branch: string): { iteration: string; taskId: string } | null {
  const m = branch.match(TASK_BRANCH_PATTERN)
  if (!m) return null
  return { iteration: m[1] as string, taskId: m[2] as string }
}

const PROVENANCE_HEADING = '### AEG provenance'

/** true when any comment already carries the provenance heading (idempotency, scoped to this PR). */
export function hasProvenance(comments: string[]): boolean {
  return comments.some((c) => c.includes(PROVENANCE_HEADING))
}

/** Tolerant field reader: accepts `Field:` and `**Field:**`, stops at line end or a `·` metadata separator. */
function extractField(body: string, labelPattern: string): string | null {
  const re = new RegExp(`(?:\\*\\*)?\\s*${labelPattern}\\s*(?:\\*\\*)?\\s*:\\s*(?:\\*\\*)?\\s*([^\\n·]+)`, 'i')
  const m = body.match(re)
  if (!m) return null
  const value = (m[1] as string).trim()
  return value.length > 0 ? value : null
}

function extractIssue(body: string): { issue: number | null; extraIssues: number[] } {
  const matches = [...body.matchAll(/Closes #(\d+)/gi)]
  const numbers = [...new Set(matches.map((m) => Number(m[1] as string)))]
  if (numbers.length === 0) return { issue: null, extraIssues: [] }
  return { issue: numbers[0] as number, extraIssues: numbers.slice(1) }
}

function extractDecision(body: string, tier: 0 | 1 | 3 | null): { decision: string; danglingNote: string | null } {
  const m = body.match(/Conforms-to(?:-lock)?\s*:\s*(D-\d+)/i)
  if (m) return { decision: `${m[1]} (conforms to existing decision)`, danglingNote: null }
  if (tier === 3) {
    return {
      decision:
        'DANGLING — Tier 3 but no `Conforms-to:` field found and no new decision entry detectable from the PR body',
      danglingNote:
        'Tier 3 PR carries no `Conforms-to: D-###` field — verify a new decision entry was added and reference it manually'
    }
  }
  return { decision: 'none', danglingNote: null }
}

function extractVerdict(
  comments: string[],
  markerPattern: RegExp,
  valuePattern: RegExp,
  missingLabel: string
): { value: string; danglingNote: string | null } {
  const hit = comments.find((c) => markerPattern.test(c))
  if (!hit) {
    return {
      value: `no ${missingLabel} pass was run before merge — DANGLING, see below`,
      danglingNote: `no ${missingLabel} verdict comment found on this PR`
    }
  }
  const m = hit.match(valuePattern)
  if (!m) {
    return {
      value: `${missingLabel} comment found but verdict marker unclear — DANGLING, see below`,
      danglingNote: `${missingLabel} comment found but could not extract a clear verdict marker`
    }
  }
  return { value: (m[1] as string).toUpperCase().replace(/[_-]/g, ' '), danglingNote: null }
}

/** Assemble the block purely from frozen facts; absent facts become DANGLING entries. */
export function buildProvenanceBlock(facts: MergedPrFacts): {
  block: string
  issue: number | null
  dangling: string[]
} {
  const ref = taskRefFromBranch(facts.headRefName)
  const dangling: string[] = []

  const { issue, extraIssues } = extractIssue(facts.body)
  if (issue === null) {
    dangling.push('no `Closes #N` found in PR body — Issue field is DANGLING, no Issue will be closed')
  }
  if (extraIssues.length > 0) {
    dangling.push(
      `PR body references additional Issues (${extraIssues.map((n) => `#${n}`).join(', ')}) beyond the first — closing only #${issue}, the rest are flagged, not closed`
    )
  }

  const tier = readTierFromPrBody(facts.body)
  if (tier === null) dangling.push('no `Tier:` field found in PR body — Tier field is DANGLING')

  const project = extractField(facts.body, 'Project(?:\\(s\\))?')
  if (!project) dangling.push('no `Project:` field found in PR body — Project(s) field is DANGLING')

  const forField = extractField(facts.body, 'For')
  if (!forField) dangling.push('no `For:` field found in PR body — Model/agent field is DANGLING')

  const { decision, danglingNote: decisionDangling } = extractDecision(facts.body, tier)
  if (decisionDangling) dangling.push(decisionDangling)

  const codeReview = extractVerdict(
    facts.comments,
    /verdict|APPROVE|REQUEST[ _-]?CHANGES|LGTM/i,
    /\b(APPROVE|REQUEST[ _-]?CHANGES|LGTM)\b/i,
    'code-reviewer'
  )
  if (codeReview.danglingNote) dangling.push(codeReview.danglingNote)

  const security = extractVerdict(
    facts.comments,
    /security.*\b(PASS|FAIL)\b|\b(PASS|FAIL)\b.*security/i,
    /\b(PASS|FAIL)\b/i,
    'security-review'
  )
  if (security.danglingNote) dangling.push(security.danglingNote)

  const ticket = extractField(facts.body, 'Ticket') ?? 'none'

  const taskLabel = ref ? `task ${ref.taskId} (iteration ${ref.iteration})` : `task (branch ${facts.headRefName})`

  const lines = [
    `${PROVENANCE_HEADING} — ${taskLabel}`,
    `- Issue:        ${issue !== null ? `#${issue}  (closed by merge)` : 'DANGLING — no Closes #N in PR body'}`,
    `- Tier:         ${tier !== null ? tier : 'DANGLING — no Tier field in PR body'}`,
    '- Brief:        in this PR body (the frozen intent)',
    `- Project(s):   ${project ?? 'DANGLING — no Project field in PR body'}`,
    `- Model/agent:  ${forField ?? 'DANGLING — no For field in PR body'}`,
    `- Code review:  ${codeReview.value}`,
    `- Security:     ${security.value}`,
    `- Decision:     ${decision}`,
    `- Ticket:       ${ticket}`,
    `- Merged:       ${facts.mergeSha} at ${facts.mergedAt}`
  ]

  if (dangling.length > 0) {
    lines.push('', `DANGLING: ${dangling.join('; ')}`)
  }

  return { block: lines.join('\n'), issue, dangling }
}
