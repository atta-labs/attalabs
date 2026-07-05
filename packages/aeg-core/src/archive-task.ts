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

import { type AnchorField, anchoredRegion } from './anchored-region'
import { headerRegion } from './brief-validation'
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

/** Removes fenced code blocks and inline code spans, so example text (e.g. a Test Plan's `Closes #123` fixture) is never parsed as a real reference. Regression from #311's first live run. */
function stripCode(body: string): string {
  return body.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '')
}

/**
 * Tolerant field reader: accepts `Field:` and `**Field:**`, line-anchored,
 * searched ONLY in the header region (shared with `brief-validation.ts`'s
 * gate — gate and archivist read the same region, so a body that passes the
 * gate can't produce a DANGLING field here). Whole-body scanning is the
 * regression from #311's first live run, where a prose sentence *about* the
 * `Ticket:` field in a later section was extracted as the field's value.
 *
 * When `anchor` is given and the body carries that anchor pair
 * (`anchored-region.ts`, task 30), the pair replaces the header region as the
 * one place the field is read from — same recognition the gate side
 * (`checkProjectField`) uses, preserving gate/archivist parity.
 */
function extractField(body: string, labelPattern: string, anchor?: AnchorField): string | null {
  const anchored = anchor !== undefined ? anchoredRegion(body, anchor) : null
  const region = anchored ?? headerRegion(body)
  const re = new RegExp(`^(?:\\*\\*)?\\s*${labelPattern}\\s*(?:\\*\\*)?\\s*:\\s*(?:\\*\\*)?\\s*([^\\n·]+)`, 'im')
  const m = region.match(re)
  if (!m) return null
  const value = (m[1] as string).trim()
  return value.length > 0 ? value : null
}

function closesRefs(text: string): number[] {
  return [...new Set([...text.matchAll(/Closes #(\d+)/gi)].map((m) => Number(m[1] as string)))]
}

/**
 * Primary Issue = first `Closes #N` in the header block (canonical placement),
 * falling back to the first anywhere in the body (flagged, not lost). Extras
 * are scanned body-wide so a real second closing reference in prose is still
 * flagged — but always fence-stripped, so example text like a Test Plan's
 * `Closes #123` fixture never counts (#311 regression).
 *
 * When the body carries an `AEG:CLOSES` anchor pair (`anchored-region.ts`,
 * task 30), the pair replaces the header block as the canonical placement:
 * the primary Issue is the first `Closes #N` inside the pair (never flagged
 * `outsideHeader` — anchored IS canonical), and extras are still scanned
 * body-wide so stray closing references stay flagged. Bodies without the
 * pair parse exactly as before.
 */
function extractIssue(body: string): { issue: number | null; extraIssues: number[]; outsideHeader: boolean } {
  const bodyNums = closesRefs(stripCode(body))
  const anchored = anchoredRegion(body, 'CLOSES')
  if (anchored !== null) {
    const anchorNums = closesRefs(stripCode(anchored))
    if (anchorNums.length === 0) return { issue: null, extraIssues: bodyNums, outsideHeader: false }
    const issue = anchorNums[0] as number
    return { issue, extraIssues: bodyNums.filter((n) => n !== issue), outsideHeader: false }
  }
  const headerNums = closesRefs(stripCode(headerRegion(body)))
  if (bodyNums.length === 0) return { issue: null, extraIssues: [], outsideHeader: false }
  const issue = headerNums.length > 0 ? (headerNums[0] as number) : (bodyNums[0] as number)
  return { issue, extraIssues: bodyNums.filter((n) => n !== issue), outsideHeader: headerNums.length === 0 }
}

function extractDecision(body: string, tier: 0 | 1 | 3 | null): { decision: string; danglingNote: string | null } {
  const m = stripCode(headerRegion(body)).match(/Conforms-to(?:-lock)?\s*:\s*(D-\d+)/i)
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

  const { issue, extraIssues, outsideHeader } = extractIssue(facts.body)
  if (issue === null) {
    dangling.push('no `Closes #N` found in PR body — Issue field is DANGLING, no Issue will be closed')
  }
  if (outsideHeader) {
    dangling.push(
      `\`Closes #${issue}\` was found outside the PR body's header block — the canonical form places it before the first \`##\` heading`
    )
  }
  if (extraIssues.length > 0) {
    dangling.push(
      `PR body references additional Issues (${extraIssues.map((n) => `#${n}`).join(', ')}) beyond the first — closing only #${issue}, the rest are flagged, not closed`
    )
  }

  const tier = readTierFromPrBody(facts.body)
  if (tier === null) dangling.push('no `Tier:` field found in PR body — Tier field is DANGLING')

  const project = extractField(facts.body, 'Project(?:\\(s\\))?', 'PROJECT')
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
