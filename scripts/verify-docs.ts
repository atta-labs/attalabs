#!/usr/bin/env bun

/**
 * verify-docs — tier-appropriate documentation gate.
 *
 * Per D-010, this is the HARD enforcement mechanism (the Archivist is advisory).
 * Per D-027, this is the first real implementation; it replaces the V0.7 stub.
 *
 * Two modes:
 *   --pr    Diff-based. Enforces that a PR carries the docs its impact tier requires.
 *           Used by the verify-docs CI workflow and by Developers locally.
 *   (full)  Repo-wide structural checks. Lighter; catches unstatused specs and
 *           malformed decision-log entries across the whole tree.
 *
 * Runs in AUDIT mode (state-machine.md Section 4): it asks "is what shipped consistent
 * with what the docs say?", not "is the design good?".
 *
 * The checks are deliberately MECHANICAL and slightly blunt. They cannot judge whether
 * a doc is *correct* — that is the Reviewer's job (roles/reviewer.md). They only judge
 * whether tier-required docs are *present and well-formed*. Blunt-but-enforced beats
 * subtle-but-trusted; that distinction is the whole point of D-010.
 *
 * Escape hatch (state-machine.md Section 12): label `override:docs` on the PR, or set
 * env OVERRIDE_DOCS=1, skips the gate. Visible in the check log.
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const mode: 'pr' | 'full' = args.includes('--pr') ? 'pr' : 'full'

const errors: string[] = []
const notes: string[] = []

// ---- helpers ---------------------------------------------------------------

function sh(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

function isDocFile(p: string): boolean {
  return (
    (p.startsWith('aeg-root/') && p.endsWith('.md')) ||
    (p.startsWith('aeg-project/') && p.endsWith('.md')) ||
    (p.includes('/aeg-project/') && p.endsWith('.md')) ||
    (p.startsWith('apps/') && p.includes('/specs/') && p.endsWith('.md')) ||
    (p.startsWith('.claude/skills/') && p.endsWith('.md')) ||
    p === 'docs-index.md' ||
    p === 'README.md' ||
    p === 'CLAUDE.md'
  )
}

function isCodeFile(p: string): boolean {
  if (p.endsWith('.md')) return false
  return /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|sql|css)$/.test(p)
}

function isSpecFile(p: string): boolean {
  return p.startsWith('apps/') && p.includes('/specs/') && p.endsWith('.md')
}

function isDecisionLog(p: string): boolean {
  return p === 'aeg-project/decisions.md' || /-decisions\.md$/.test(p)
}

/**
 * Derive a tier from the changed-file list when no `Tier:` field is in the PR body.
 *
 * Rules (in priority order):
 *   1. Decision log in diff       → Tier 3  (caller must still emit C0 — explicit declaration required)
 *   2. Spec or doc file in diff   → Tier 1
 *   3. Otherwise (code/config…)   → Tier 0
 *
 * Exported for unit tests.
 */
export function deriveTierFromDiff(changed: string[]): 0 | 1 | 3 {
  if (changed.some(isDecisionLog)) return 3
  if (changed.some((p) => isSpecFile(p) || isDocFile(p))) return 1
  return 0
}

function hasStatusBlock(content: string): boolean {
  return /(^|\n)\s*(\*\*)?Status:?(\*\*)?\s*:?\s*(draft|target|ratified|retired)/i.test(content)
}

/** Each `## D-NNN` heading must have a Status and Type field in its block. */
function malformedDecisionEntries(content: string): string[] {
  const bad: string[] = []
  const blocks = content.split(/\n(?=## )/)
  for (const block of blocks) {
    const m = block.match(/^##\s+(D-\d+|CONTRADICTION)\b.*/m)
    if (!m) continue
    if (m[1].startsWith('CONTRADICTION')) continue
    const hasStatus = /(^|\n)\*\*Status:\*\*/.test(block)
    const hasType = /(^|\n)\*\*Type:\*\*/.test(block)
    if (!hasStatus || !hasType) {
      bad.push(m[1])
    }
  }
  return bad
}

/**
 * Read the `Tier:` field from the PR body.
 *
 * Tolerates the three markdown shapes the field appears in:
 *   - plain:        `Tier: 3`
 *   - bold colon:   `**Tier:** 3`   (the `**` wraps `Tier:` including the colon)
 *   - bold label:   `**Tier**: 3`   (the `**` wraps only `Tier`)
 *
 * The field may appear inline in a metadata line (e.g.
 * `Iteration: x · Task: 1 · **Tier:** 3 · Project: y`), so it is NOT anchored
 * to line-start. Returns null when no Tier field is present at all — the caller
 * decides what a missing tier means (PR mode treats it as an explicit error,
 * NOT a silent default — see runPrMode).
 */
function readTierFromPrBody(): 0 | 1 | 3 | null {
  const body = process.env.PR_BODY || ''
  // Match an optional bold-open, the word Tier, an optional bold-close, a colon,
  // an optional bold-close (covers `**Tier:**`), optional space, then the digit.
  const m = body.match(/(\*\*)?\s*Tier\s*(\*\*)?\s*:\s*(\*\*)?\s*([013])\b/i)
  if (!m) return null
  const t = Number(m[4])
  return t === 0 || t === 1 || t === 3 ? (t as 0 | 1 | 3) : null
}

function overrideActive(): boolean {
  if (process.env.OVERRIDE_DOCS === '1') return true
  const labels = (process.env.PR_LABELS || '').split(',').map((s) => s.trim())
  if (labels.includes('override:docs')) return true
  if ((process.env.PR_BODY || '').includes('[override:docs]')) return true
  return false
}

// ---- PR mode ---------------------------------------------------------------

function runPrMode(): void {
  if (overrideActive()) {
    console.log('verify-docs: override:docs active — gate skipped (logged for audit).')
    return
  }

  const base = process.env.BASE_SHA || 'origin/main'
  let changed = sh(`git diff --name-only ${base}...HEAD`)
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

  if (changed.length === 0) {
    // Fallback for local runs without an explicit base.
    changed = sh('git diff --name-only main...HEAD')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
  }

  if (changed.length === 0) {
    console.log('verify-docs: no changed files detected against base; nothing to check.')
    return
  }

  const tierFromBody = readTierFromPrBody()
  let effectiveTier: 0 | 1 | 3
  if (tierFromBody !== null) {
    effectiveTier = tierFromBody
  } else {
    const derived = deriveTierFromDiff(changed)
    if (derived === 3) {
      // Decision-log in diff — Tier 3 has lock/irreversibility implications.
      // Auto-derive is blocked; the author must confirm with an explicit declaration.
      errors.push(
        'C0 tier-required: No `Tier:` field found in the PR body, and the diff includes a decision log — Tier 3 work requires an explicit `Tier: 3` declaration (lock/irreversibility implications a human must confirm). The canonical PR-body form lives in `aeg-root/roles/developer.md` § PR body — canonical form. (state-machine.md Section 9)'
      )
      finish()
      return
    }
    notes.push(`no Tier field in PR body; derived Tier ${derived} from diff`)
    effectiveTier = derived
  }

  const codeFiles = changed.filter(isCodeFile)
  const docFiles = changed.filter(isDocFile)
  const specFiles = changed.filter(isSpecFile)
  const decisionLogs = changed.filter(isDecisionLog)

  // C1 — changed spec files must carry a Status block.
  for (const p of specFiles) {
    if (!existsSync(p)) continue // deleted
    if (!hasStatusBlock(readFileSync(p, 'utf8'))) {
      errors.push(
        `C1 spec-status: ${p} is missing a \`Status:\` block (accepted values: draft, target, ratified, retired). See state-machine.md Section 5.`
      )
    }
  }

  // C2 — changed decision logs must have well-formed entries.
  for (const p of decisionLogs) {
    if (!existsSync(p)) continue
    const bad = malformedDecisionEntries(readFileSync(p, 'utf8'))
    if (bad.length) {
      errors.push(
        `C2 decision-shape: ${p} has entries missing Status/Type: ${bad.join(', ')}. See state-machine.md Section 6.`
      )
    }
  }

  // C3 — code changes (tier 1+) must be accompanied by at least one doc change.
  if (effectiveTier !== 0 && codeFiles.length > 0 && docFiles.length === 0) {
    errors.push(
      `C3 code-requires-docs: ${codeFiles.length} code file(s) changed but no documentation file changed. Tier ${effectiveTier} work updates specs/skills/PM docs. If this is genuinely trivial, set \`Tier: 0\` in the PR body. (state-machine.md Section 9)`
    )
  }

  // C4 — Tier 3 must carry either a new decision log entry OR a reference to an
  // existing decision this work conforms to. The conformance path exists for PRs
  // that implement work under an already-recorded decision without introducing a
  // new architectural choice (e.g. adding contracts under the decision that
  // established the contract system). A `Conforms-to: D-###` or
  // `Conforms-to-lock: D-###` field in the PR body satisfies this path.
  const conformsToDecision = /Conforms-to(?:-lock)?\s*:\s*\*{0,2}\s*D-\d+/i.test(process.env.PR_BODY || '')
  if (effectiveTier === 3 && decisionLogs.length === 0 && !conformsToDecision) {
    errors.push(
      'C4 tier3-decision-log: Tier 3 work requires either (a) a decision log entry (global decisions.md or a per-project *-decisions.md), or (b) a `Conforms-to: D-###` or `Conforms-to-lock: D-###` field in the PR body for conforming work. Neither found. (state-machine.md Section 9)'
    )
  }
}

// ---- full mode -------------------------------------------------------------

function runFullMode(): void {
  // F1 — every spec carries a Status block.
  const specs = sh("git ls-files 'apps/**/specs/*.md'")
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  for (const p of specs) {
    if (!existsSync(p)) continue
    if (!hasStatusBlock(readFileSync(p, 'utf8'))) {
      errors.push(`F1 spec-status: ${p} is missing a \`Status:\` block.`)
    }
  }

  // F2 — decision-log entries well-formed.
  const logs = sh("git ls-files 'aeg-project/decisions.md' 'apps/**/*-decisions.md'")
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  for (const p of logs) {
    if (!existsSync(p)) continue
    const bad = malformedDecisionEntries(readFileSync(p, 'utf8'))
    if (bad.length) {
      errors.push(`F2 decision-shape: ${p} entries missing Status/Type: ${bad.join(', ')}.`)
    }
  }
}

// ---- output ----------------------------------------------------------------

function finish(): void {
  for (const n of notes) console.log(`verify-docs note: ${n}`)

  if (errors.length) {
    console.error(`\nverify-docs FAILED (${mode} mode) — ${errors.length} issue(s):\n`)
    for (const e of errors) console.error(`  ✗ ${e}`)
    console.error('\nFix the docs, or (Principal only) apply the override:docs label. See state-machine.md Section 12.')
    process.exit(1)
  }

  console.log(`verify-docs passed (${mode} mode).`)
  process.exit(0)
}

// ---- run -------------------------------------------------------------------

if (import.meta.main) {
  if (mode === 'pr') runPrMode()
  else runFullMode()

  finish()
}
