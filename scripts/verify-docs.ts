#!/usr/bin/env bun

/**
 * verify-docs — tier-appropriate documentation gate.
 *
 * Per D-010, this is the HARD enforcement mechanism (the Archivist is advisory).
 * Per D-027, this is the first real implementation; it replaces the V0.7 stub.
 *
 * Modes:
 *   --pr              Diff-based. Enforces that a PR carries the docs its impact tier requires.
 *                     Used by the verify-docs CI workflow and by Developers locally.
 *   (full)            Repo-wide structural checks. Catches unstatused specs, malformed
 *                     decision-log entries, manifest validity, and the completeness scoreboard.
 *   --next-decision   Helper: print the next free D-NNN for aeg-project/decisions.md and exit.
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
import { existsSync, readdirSync, readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const isNextDecision = args.includes('--next-decision')
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

// ---- C5 doc-coverage (doc-owners) -----------------------------------------

export const DOC_OWNERS_PATH = 'aeg-root/doc-owners'

export type DocOwnersBinding = { glob: string; pointer: string; lineNum: number }

export type C5Result = { errors: string[]; notes: string[] }

/**
 * Parse the doc-owners file. Each non-blank, non-comment line is
 *   `<code-glob>  <doc-pointer>`
 *
 * Comments start with `#`. Pointer is in-repo path, path#anchor, or URL.
 * Returns the parsed bindings + any malformed-line errors.
 */
export function parseDocOwners(content: string): { bindings: DocOwnersBinding[]; errors: string[] } {
  const bindings: DocOwnersBinding[] = []
  const errors: string[] = []
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? ''
    const stripped = raw.replace(/#.*$/, '').trim()
    if (!stripped) continue
    const parts = stripped.split(/\s+/)
    if (parts.length < 2) {
      errors.push(
        `C5 doc-owners-parse: ${DOC_OWNERS_PATH}:${i + 1} — malformed binding (expected "<glob>  <pointer>", got "${raw.trim()}").`
      )
      continue
    }
    const [glob, ...pointerParts] = parts
    bindings.push({ glob: glob ?? '', pointer: pointerParts.join(' '), lineNum: i + 1 })
  }
  return { bindings, errors }
}

/**
 * Translate a doc-owners glob to a RegExp. Deliberately simple — only `*` and
 * `**` are special; every other character is literal so Next.js dynamic-route
 * segments like `[username]` match without escaping.
 */
export function globToRegex(pat: string): RegExp {
  let re = '^'
  let i = 0
  while (i < pat.length) {
    const c = pat[i]
    if (c === '*') {
      if (pat[i + 1] === '*') {
        re += '.*'
        i += 2
      } else {
        re += '[^/]*'
        i += 1
      }
    } else if (/[.+^$|(){}[\]\\?]/.test(c as string)) {
      re += `\\${c}`
      i += 1
    } else {
      re += c
      i += 1
    }
  }
  re += '$'
  return new RegExp(re)
}

function isUrlPointer(p: string): boolean {
  return /^https?:\/\//.test(p)
}

function pointerToPath(p: string): string {
  const idx = p.indexOf('#')
  return idx === -1 ? p : p.slice(0, idx)
}

type DocAck = { surface: string; note: string }
type DocWaiver = { pointer: string; reason: string }

// Separator between <pointer> and <note|reason>. Tolerates em-dash (—),
// en-dash (–), or a plain ASCII hyphen-minus (-) with REQUIRED surrounding
// whitespace. Required whitespace around `-` disambiguates the separator
// from hyphens that legitimately appear inside pointers (e.g. `aeg-root`,
// `.claude/skills/ui-components/SKILL.md`). Non-greedy `(.+?)` for the
// pointer plus this anchored separator means the pointer naturally stops
// at the first valid separator without literally excluding `-` from
// the pointer character set.
const SEPARATOR = /(?:[ \t]*[—–][ \t]*|[ \t]+-[ \t]+)/.source

function readDocAcks(body: string): DocAck[] {
  const acks: DocAck[] = []
  const re = new RegExp(`^[ \\t]*Doc-ack[ \\t]*:[ \\t]*(.+?)${SEPARATOR}(.+?)[ \\t]*$`, 'gim')
  for (const m of body.matchAll(re)) {
    acks.push({ surface: m[1].trim(), note: m[2].trim() })
  }
  return acks
}

function readDocWaivers(body: string): DocWaiver[] {
  const waivers: DocWaiver[] = []
  const re = new RegExp(`^[ \\t]*Doc-waiver[ \\t]*:[ \\t]*(.+?)${SEPARATOR}(.+?)[ \\t]*$`, 'gim')
  for (const m of body.matchAll(re)) {
    waivers.push({ pointer: m[1].trim(), reason: m[2].trim() })
  }
  return waivers
}

/**
 * Pure evaluator for the C5 doc-coverage check. The runtime wrapper reads
 * `aeg-root/doc-owners` from disk and `PR_BODY` from env; this function takes
 * both as inputs and an injectable file-exists for unit tests.
 *
 * Dormancy: a null `docOwnersContent` (absent file) OR no glob matching any
 * changed code file produces an empty result — no errors, no notes.
 */
export function evaluateC5(
  changed: string[],
  docOwnersContent: string | null,
  prBody: string,
  fileExists: (p: string) => boolean = existsSync
): C5Result {
  const out: C5Result = { errors: [], notes: [] }

  if (docOwnersContent === null) return out

  const { bindings, errors: parseErrors } = parseDocOwners(docOwnersContent)
  for (const e of parseErrors) out.errors.push(e)
  if (bindings.length === 0) return out

  const codeFiles = changed.filter(isCodeFile)
  const fired: DocOwnersBinding[] = []
  for (const b of bindings) {
    const re = globToRegex(b.glob)
    if (codeFiles.some((f) => re.test(f))) fired.push(b)
  }
  if (fired.length === 0) return out

  const waivers = readDocWaivers(prBody)
  const acks = readDocAcks(prBody)

  for (const b of fired) {
    const waived = waivers.find((w) => w.pointer === b.pointer)
    if (waived) {
      out.notes.push(
        `C5 doc-waiver active for ${b.pointer} (binding ${DOC_OWNERS_PATH}:${b.lineNum}): ${waived.reason}`
      )
      continue
    }

    if (isUrlPointer(b.pointer)) {
      const acked = acks.some((a) => a.surface === b.pointer)
      if (!acked) {
        out.errors.push(
          `C5 doc-coverage: code change matched ${DOC_OWNERS_PATH}:${b.lineNum} (glob \`${b.glob}\` → ${b.pointer}). External pointer requires \`Doc-ack: ${b.pointer} — <note>\` in the PR body, or \`Doc-waiver: ${b.pointer} — <reason>\` to skip.`
        )
      }
      continue
    }

    const pointerPath = pointerToPath(b.pointer)
    if (!fileExists(pointerPath)) {
      out.errors.push(
        `C5 doc-owners-dangling: ${DOC_OWNERS_PATH}:${b.lineNum} points to ${b.pointer}, which does not exist on disk. Fix the binding or add the doc.`
      )
      continue
    }

    if (!changed.includes(pointerPath)) {
      out.errors.push(
        `C5 doc-coverage: code change matched ${DOC_OWNERS_PATH}:${b.lineNum} (glob \`${b.glob}\` → ${b.pointer}), but ${pointerPath} is not in the PR diff. Update it, or add \`Doc-waiver: ${b.pointer} — <reason>\` to the PR body.`
      )
    }
  }

  return out
}

// ---- N1/N2: decision-number integrity (full mode, exported for verify-coherence) ----

/**
 * Extract and validate D-NNN numbers within a single decision log.
 * N1 (hard-fail): duplicate numbers within the log.
 * N2 (advisory): skipped numbers (gaps expected cross-log per state-machine §6).
 * Exported so verify-coherence.ts can delegate N1/N2 without reimplementing.
 */
export function checkDecisionNumbers(
  content: string,
  logPath: string
): { n1Errors: string[]; n2Notes: string[]; numbers: number[] } {
  const raw: number[] = []
  for (const m of content.matchAll(/^## D-(\d+)\b/gm)) {
    raw.push(Number(m[1]))
  }

  const n1Errors: string[] = []
  const n2Notes: string[] = []

  const seen = new Map<number, number>()
  for (const n of raw) seen.set(n, (seen.get(n) ?? 0) + 1)
  for (const [n, count] of seen) {
    if (count > 1) {
      n1Errors.push(
        `N1 decision-duplicate: ${logPath} — D-${String(n).padStart(3, '0')} appears ${count} times. Numbers must be unique within a log.`
      )
    }
  }

  const sorted = [...new Set(raw)].sort((a, b) => a - b)
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1] as number
    const curr = sorted[i] as number
    if (curr > prev + 1) {
      const skipped = Array.from(
        { length: curr - prev - 1 },
        (_, k) => `D-${String(prev + 1 + k).padStart(3, '0')}`
      ).join(', ')
      n2Notes.push(
        `N2 decision-skip: ${logPath} — gap after D-${String(prev).padStart(3, '0')}: ${skipped}. (Cross-log gaps are expected — state-machine §6.)`
      )
    }
  }

  return { n1Errors, n2Notes, numbers: sorted }
}

// ---- M1/M2/M3: manifest validity (full mode, exported for verify-coherence) ----

export type NoDocRule = { glob: string; reason: string }

/**
 * Parse `# no-doc: <glob> — <reason>` allow-list lines from doc-owners content.
 * These lines exempt a surface from the completeness scoreboard.
 */
export function parseNoDocRules(content: string): NoDocRule[] {
  const rules: NoDocRule[] = []
  for (const line of content.split('\n')) {
    const m = line.match(/^#\s+no-doc:\s+(\S+)(?:\s+[—–]\s+|\s+-\s+)(.+)$/)
    if (m) rules.push({ glob: (m[1] ?? '').trim(), reason: (m[2] ?? '').trim() })
  }
  return rules
}

/**
 * Validate the doc-owners manifest file (all bindings, not just fired ones).
 * M1 (hard-fail): in-repo pointer does not exist on disk.
 * M2 (advisory): glob fails to produce a valid regex (extremely unlikely with our simple grammar).
 * M3 (hard-fail): same glob appears more than once.
 * Exported so verify-coherence.ts can delegate M1/M2/M3.
 */
export function checkManifestValidity(
  content: string | null,
  fileExists: (p: string) => boolean = existsSync
): { m1Errors: string[]; m2Notes: string[]; m3Errors: string[]; noDocRules: NoDocRule[] } {
  if (content === null) return { m1Errors: [], m2Notes: [], m3Errors: [], noDocRules: [] }

  const { bindings, errors: parseErrors } = parseDocOwners(content)
  const m1Errors: string[] = [...parseErrors]
  const m2Notes: string[] = []
  const m3Errors: string[] = []
  const noDocRules = parseNoDocRules(content)

  // M2: glob syntax (advisory — our grammar is permissive so failures are very rare)
  for (const b of bindings) {
    if (!b.glob) {
      m2Notes.push(`M2 manifest-bad-glob: ${DOC_OWNERS_PATH}:${b.lineNum} — empty glob.`)
      continue
    }
    try {
      globToRegex(b.glob)
    } catch (e) {
      m2Notes.push(`M2 manifest-bad-glob: ${DOC_OWNERS_PATH}:${b.lineNum} — glob "${b.glob}" failed: ${e}`)
    }
  }

  // M3: duplicate globs
  const globLines = new Map<string, number[]>()
  for (const b of bindings) {
    const list = globLines.get(b.glob) ?? []
    list.push(b.lineNum)
    globLines.set(b.glob, list)
  }
  for (const [glob, lines] of globLines) {
    if (lines.length > 1) {
      m3Errors.push(
        `M3 manifest-duplicate-glob: ${DOC_OWNERS_PATH} — glob "${glob}" appears ${lines.length} times (lines ${lines.join(', ')}).`
      )
    }
  }

  // M1: every in-repo pointer exists on disk (checks ALL bindings, not just fired ones)
  for (const b of bindings) {
    if (isUrlPointer(b.pointer)) continue
    const pointerPath = pointerToPath(b.pointer)
    if (!fileExists(pointerPath)) {
      m1Errors.push(
        `M1 manifest-dangling: ${DOC_OWNERS_PATH}:${b.lineNum} — pointer ${b.pointer} does not exist on disk.`
      )
    }
  }

  return { m1Errors, m2Notes, m3Errors, noDocRules }
}

function runC5(changed: string[]): void {
  const content = existsSync(DOC_OWNERS_PATH) ? readFileSync(DOC_OWNERS_PATH, 'utf8') : null
  const result = evaluateC5(changed, content, process.env.PR_BODY || '')
  for (const e of result.errors) errors.push(e)
  for (const n of result.notes) notes.push(n)
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

  // C5 — code→doc coverage via aeg-root/doc-owners (dormant when absent).
  runC5(changed)
}

// ---- full mode -------------------------------------------------------------

function findDecisionLogs(): string[] {
  return sh("git ls-files 'aeg-project/decisions.md' 'apps/**/*-decisions.md'")
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

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
  const logPaths = findDecisionLogs()
  for (const p of logPaths) {
    if (!existsSync(p)) continue
    const bad = malformedDecisionEntries(readFileSync(p, 'utf8'))
    if (bad.length) {
      errors.push(`F2 decision-shape: ${p} entries missing Status/Type: ${bad.join(', ')}.`)
    }
  }

  // N1/N2 — decision-number integrity within each log.
  for (const p of logPaths) {
    if (!existsSync(p)) continue
    const { n1Errors, n2Notes } = checkDecisionNumbers(readFileSync(p, 'utf8'), p)
    for (const e of n1Errors) errors.push(e)
    for (const n of n2Notes) notes.push(n)
  }

  // M1/M2/M3 — doc-owners manifest validity.
  const docOwnersContent = existsSync(DOC_OWNERS_PATH) ? readFileSync(DOC_OWNERS_PATH, 'utf8') : null
  const { m1Errors, m2Notes, m3Errors, noDocRules } = checkManifestValidity(docOwnersContent)
  for (const e of m1Errors) errors.push(e)
  for (const n of m2Notes) notes.push(n)
  for (const e of m3Errors) errors.push(e)

  // Completeness scoreboard — advisory; report unbound surfaces not in the # no-doc: allow-list.
  if (docOwnersContent !== null) {
    const { bindings } = parseDocOwners(docOwnersContent)
    runCompletenessScoreboard(bindings, noDocRules)
  }
}

function runCompletenessScoreboard(bindings: DocOwnersBinding[], noDocRules: NoDocRule[]): void {
  const noDocGlobs = noDocRules.map((r) => {
    const pat = r.glob.endsWith('/**') ? r.glob : `${r.glob}/**`
    return globToRegex(pat)
  })

  const isExempt = (dir: string) => noDocGlobs.some((re) => re.test(`${dir}/`))

  const hasBound = (dir: string) => bindings.some((b) => b.glob.startsWith(`${dir}/`) || b.glob === `${dir}/**`)

  const unbound: string[] = []

  // Check top-level packages/* and apps/*
  for (const root of ['packages', 'apps']) {
    if (!existsSync(root)) continue
    for (const name of readdirSync(root)) {
      const dir = `${root}/${name}`
      if (!existsSync(dir)) continue
      if (hasBound(dir) || isExempt(dir)) continue
      unbound.push(dir)
    }
  }

  if (unbound.length > 0) {
    notes.push(
      `Completeness scoreboard (advisory): ${unbound.length} surface(s) with no doc-owners binding — add a binding or a \`# no-doc: <glob> — <reason>\` line to suppress:`
    )
    for (const d of unbound) notes.push(`  unbound: ${d}`)
  } else {
    notes.push('Completeness scoreboard: all top-level surfaces are bound or exempted.')
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
  if (isNextDecision) {
    // --next-decision: print the next free D-NNN for aeg-project/decisions.md and exit.
    const logPath = 'aeg-project/decisions.md'
    if (!existsSync(logPath)) {
      console.log(`${logPath} not found; next free number: D-001`)
      process.exit(0)
    }
    const { numbers } = checkDecisionNumbers(readFileSync(logPath, 'utf8'), logPath)
    const next = numbers.length === 0 ? 1 : ((numbers[numbers.length - 1] ?? 0) as number) + 1
    console.log(`Next free D-number in ${logPath}: D-${String(next).padStart(3, '0')}`)
    process.exit(0)
  }

  if (mode === 'pr') runPrMode()
  else runFullMode()

  finish()
}
