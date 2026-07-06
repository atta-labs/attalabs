#!/usr/bin/env bun

/**
 * verify-docs — tier-appropriate documentation gate.
 *
 * Per D-010, this is the HARD enforcement mechanism (the Archivist is advisory).
 * Per D-027, this is the first real implementation; it replaces the V0.7 stub.
 * Per aeg-consolidation task 1, the check logic below is a thin CLI shim: it
 * resolves args/env, reads the filesystem/git, and calls the pure, tested
 * functions homed in `@atta/aeg-core`. The checks themselves — including their
 * exact wording — live there now, not here.
 *
 * Modes:
 *   --pr              Diff-based. Enforces that a PR carries the docs its impact tier requires.
 *                     C5's waiver is, since D-097, a PR-wide `waiver:docs` label whose labeling
 *                     timeline event's actor is a configured principal — never a parseable
 *                     string. Label presence alone is never sufficient. CI resolves the actor
 *                     via GraphQL into WAIVER_LABEL_ACTOR; `runC5` verifies it with
 *                     `isWaiverLabelActorVerified` before calling `evaluateC5`. The prior
 *                     `Doc-waiver:` PR-body/commit-trailer grammar (D-080) is gone — it is no
 *                     longer parsed anywhere. `Doc-ack:` (URL-pointer acknowledgment) is
 *                     unaffected by D-097 — still a PR-body field, still an acknowledgment, not
 *                     a bypass.
 *   --push            Diff-based, C5 only. Ring-0 gate for `.husky/pre-push` (D-078): the
 *                     branch's cumulative diff vs origin/main is checked against doc-owners
 *                     coverage. Since D-097, an owned-doc violation on push is
 *                     warn-with-declared-intent, not a hard block: the push is always allowed,
 *                     and the printed message states plainly that ring 1 (the PR, once opened)
 *                     stays red until a principal applies the `waiver:docs` label or the bound
 *                     doc is updated. This replaces D-080's first-push commit-trailer
 *                     self-service — there is no first-push waiver self-service anymore, only an
 *                     informative warning; ring 1 is where the waiver is actually granted.
 *                     PR_BODY (when the branch already has an open PR) still supplies `Doc-ack:`
 *                     lines; on a first push (no PR yet), the hook still falls back to this
 *                     branch's own commit-message trailers as PR_BODY, since `Doc-ack:` (D-097
 *                     does not touch it) still needs that source. For a pre-authoring dry run
 *                     via `verify-dispatch --simulate`, before any commit exists at all,
 *                     PR_BODY_FILE — a local path to a drafted-but-not-yet-committed PR body —
 *                     is an equally valid source for the same `Doc-ack:` lines (D-081).
 *                     `override:docs`/`OVERRIDE_DOCS=1` is honored here identically to `--pr`
 *                     mode. C0-C4 are PR-body contracts and stay at the PR gates.
 *                     Used by the verify-docs CI workflow and by Developers locally.
 *   (full)            Repo-wide structural checks. Catches unstatused specs, malformed
 *                     decision-log entries, manifest validity, the completeness scoreboard,
 *                     and the surfaced-doc manifest coherence check (C6 — state-machine.md
 *                     Section 15c): every surfaced doc under `aeg-root/` must be reachable
 *                     in the doc-nav tree, with no orphans and no dangling cross-references.
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
 *
 * CWD-independent by design: chdir's to the repo root immediately below. Every
 * relative path here (DOC_OWNERS_PATH, git diff/ls-files, readdirSync walks)
 * must resolve correctly regardless of the invoking process's own working
 * directory — this script is a sibling of verify-coherence.ts, which is
 * spawned as a subprocess without an explicit cwd (apps/aeg/web/studio's API
 * routes).
 */

import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { type DocsCoherenceEntry, evaluateDocsCoherence, parseDocFrontmatter } from '../src/docs'
import {
  checkDecisionNumbers,
  checkManifestValidity,
  DOC_OWNERS_PATH,
  deriveTierFromDiff,
  type DocOwnersBinding,
  evaluateC5,
  globToRegex,
  hasStatusBlock,
  isCodeFile,
  isDecisionLog,
  isDocFile,
  isSpecFile,
  isWaiverLabelActorVerified,
  malformedDecisionEntries,
  type NoDocRule,
  overrideActive,
  parseDocOwners,
  PRINCIPAL_ALLOWLIST,
  readTierFromPrBody,
  WAIVER_LABEL
} from '../src/index'

const REPO_ROOT = join(import.meta.dir, '../../..')
process.chdir(REPO_ROOT)

const args = process.argv.slice(2)
const isNextDecision = args.includes('--next-decision')
const mode: 'pr' | 'push' | 'full' = args.includes('--pr') ? 'pr' : args.includes('--push') ? 'push' : 'full'

const errors: string[] = []
const notes: string[] = []

// ---- I/O helpers ------------------------------------------------------------

function sh(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

/**
 * PR_BODY takes precedence when set (the PR-mode caller always sets it).
 * PR_BODY_FILE is the push-mode fallback for a branch with no PR yet — a
 * local path to the drafted PR body, so `Doc-ack:` lines (D-097 does not
 * touch that grammar) are available deterministically before the PR exists
 * (D-324/task 11).
 */
function resolvePrBody(): string {
  if (process.env.PR_BODY) return process.env.PR_BODY
  if (process.env.PR_BODY_FILE) {
    try {
      return readFileSync(process.env.PR_BODY_FILE, 'utf8')
    } catch {
      return ''
    }
  }
  return ''
}

/**
 * D-097: a waiver is honored only when the `waiver:docs` label is present AND
 * the actor of its labeling timeline event is a configured principal.
 * WAIVER_LABEL_ACTOR is resolved by CI (the GraphQL step ahead of this gate)
 * or is empty/unset locally — an empty/unset actor never verifies.
 */
function waiverActiveFromEnv(): boolean {
  const labels = (process.env.PR_LABELS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return isWaiverLabelActorVerified({
    labels,
    labelActor: process.env.WAIVER_LABEL_ACTOR || null,
    principalAllowlist: PRINCIPAL_ALLOWLIST
  })
}

function runC5(changed: string[]): void {
  const content = existsSync(DOC_OWNERS_PATH) ? readFileSync(DOC_OWNERS_PATH, 'utf8') : null
  const result = evaluateC5(changed, content, resolvePrBody(), existsSync, waiverActiveFromEnv())
  for (const e of result.errors) errors.push(e)
  for (const n of result.notes) notes.push(n)
}

// ---- PR mode ---------------------------------------------------------------

function runPrMode(): void {
  if (
    overrideActive({
      overrideDocsEnv: process.env.OVERRIDE_DOCS,
      prLabels: process.env.PR_LABELS,
      prBody: process.env.PR_BODY
    })
  ) {
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

  const tierFromBody = readTierFromPrBody(process.env.PR_BODY || '')
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

// ---- push mode (C5 only — D-078 ring-0 pre-push gate) -----------------------

function runPushMode(): void {
  if (
    overrideActive({
      overrideDocsEnv: process.env.OVERRIDE_DOCS,
      prLabels: process.env.PR_LABELS,
      prBody: resolvePrBody()
    })
  ) {
    console.log('verify-docs: override:docs active — gate skipped (logged for audit).')
    return
  }

  const base = process.env.BASE_SHA || 'origin/main'
  const changed = sh(`git diff --name-only ${base}...HEAD`)
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean)
  if (changed.length === 0) {
    console.log('verify-docs: no changed files vs base; nothing to check.')
    return
  }
  runC5(changed)

  for (const n of notes) console.log(`verify-docs note: ${n}`)

  // D-097 ring 0: warn-with-declared-intent, never a hard block. The push always
  // succeeds; ring 1 (the PR, once opened) is where a waiver is actually granted.
  if (errors.length) {
    console.error(
      `\nverify-docs (push mode) — push allowed, but ${errors.length} owned-doc binding(s) are unsatisfied. Ring 1 stays red until a principal applies the \`${WAIVER_LABEL}\` label to this branch's PR, or the bound doc is updated:\n`
    )
    for (const e of errors) console.error(`  ⚠ ${e}`)
  } else {
    console.log('verify-docs passed (push mode).')
  }
  process.exit(0)
}

// ---- full mode -------------------------------------------------------------

function findDecisionLogs(): string[] {
  return sh("git ls-files 'aeg-project/decisions.md' 'apps/**/*-decisions.md'")
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

const AEG_ROOT_PREFIX = 'aeg-root/'

function runC6(): void {
  const files = sh("git ls-files 'aeg-root/*.md'")
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

  const entries: DocsCoherenceEntry[] = files.map((filePath) => {
    const raw = existsSync(filePath) ? readFileSync(filePath, 'utf8') : ''
    const parsed = parseDocFrontmatter(raw)
    return {
      relPath: filePath.slice(AEG_ROOT_PREFIX.length),
      frontmatter: parsed.frontmatter,
      body: parsed.body,
      firstH1: parsed.firstH1
    }
  })

  const result = evaluateDocsCoherence(entries)
  for (const e of result.errors) errors.push(e)
  for (const n of result.notes) notes.push(n)
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
  const { m1Errors, m2Notes, m3Errors, noDocRules } = checkManifestValidity(docOwnersContent, existsSync)
  for (const e of m1Errors) errors.push(e)
  for (const n of m2Notes) notes.push(n)
  for (const e of m3Errors) errors.push(e)

  // Completeness scoreboard — advisory; report unbound surfaces not in the # no-doc: allow-list.
  if (docOwnersContent !== null) {
    const { bindings } = parseDocOwners(docOwnersContent)
    runCompletenessScoreboard(bindings, noDocRules)
  }

  // C6 — surfaced-doc manifest coherence (state-machine.md Section 15c).
  runC6()
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
  else if (mode === 'push') runPushMode()
  else runFullMode()

  finish()
}
