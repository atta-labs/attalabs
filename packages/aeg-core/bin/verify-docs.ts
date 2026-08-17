#!/usr/bin/env bun

/**
 * verify-docs — tier-appropriate documentation gate.
 *
 * This is the HARD enforcement mechanism — the Archivist is advisory.
 * Per aeg-consolidation task 1, the check logic below is a thin CLI shim: it
 * resolves args/env, reads the filesystem/git, and calls the pure, tested
 * functions homed in `@atta/aeg-core`. The checks themselves — including their
 * exact wording — live there now, not here.
 *
 * Modes:
 *   --pr              Diff-based. Enforces that a PR carries the docs its impact tier requires.
 *                     C5's waiver is a PR-wide `vinaya/waiver:docs` label whose labeling
 *                     timeline event's actor is a configured principal — never a parseable
 *                     string. Label presence alone is never sufficient. CI resolves the actor
 *                     via GraphQL into WAIVER_LABEL_ACTOR; `runC5` verifies it with
 *                     `isWaiverLabelActorVerified` before calling `evaluateC5`. The prior
 *                     `Doc-waiver:` PR-body/commit-trailer grammar is gone — it is no
 *                     longer parsed anywhere. `Doc-ack:` (URL-pointer acknowledgment) is
 *                     unaffected — still a PR-body field, still an acknowledgment, not
 *                     a bypass. `Doc-neutral: <pointer> — <note>` (state-machine.md
 *                     Section 15) is the third satisfying branch: a fired binding whose
 *                     doc genuinely isn't owed because the matched code diff is
 *                     comment/whitespace-only. The declaration alone never satisfies it —
 *                     `evaluateC5` cross-checks the actual diff via
 *                     `isMechanicallyNeutralDiff` before honoring it, so it can't be
 *                     self-served the way a bare claim could.
 *   --push            Diff-based, C5 only. Ring-0 gate for `.husky/pre-push`: the
 *                     branch's cumulative diff vs origin/main is checked against doc-owners
 *                     coverage. An owned-doc violation on push is
 *                     warn-with-declared-intent, not a hard block: the push is always allowed,
 *                     and the printed message states plainly that ring 1 (the PR, once opened)
 *                     stays red until a principal applies the `vinaya/waiver:docs` label or the bound
 *                     doc is updated. There is no first-push waiver self-service — only an
 *                     informative warning; ring 1 is where the waiver is actually granted.
 *                     PR_BODY (when the branch already has an open PR) still supplies `Doc-ack:`
 *                     lines; on a first push (no PR yet), the hook still falls back to this
 *                     branch's own commit-message trailers as PR_BODY, since `Doc-ack:` still
 *                     needs that source. For a pre-authoring dry run,
 *                     via `verify-dispatch --simulate`, before any commit exists at all,
 *                     PR_BODY_FILE — a local path to a drafted-but-not-yet-committed PR body —
 *                     is an equally valid source for the same `Doc-ack:` lines.
 *                     `vinaya/override:docs`/`OVERRIDE_DOCS=1` is honored here identically to `--pr`
 *                     mode. C1/C3 are PR-body contracts and stay at the PR gates.
 *                     Used by the verify-docs CI workflow and by Developers locally.
 *   (full)            Repo-wide structural checks. Catches unstatused specs, manifest
 *                     validity, the completeness scoreboard,
 *                     and the surfaced-doc manifest coherence check (C6 — state-machine.md
 *                     Section 15c): every surfaced doc under `aeg-root/` must be reachable
 *                     in the doc-nav tree, with no orphans and no dangling cross-references.
 *
 * Runs in AUDIT mode (state-machine.md Section 4): it asks "is what shipped consistent
 * with what the docs say?", not "is the design good?".
 *
 * The checks are deliberately MECHANICAL and slightly blunt. They cannot judge whether
 * a doc is *correct* — that is the Reviewer's job (roles/reviewer.md). They only judge
 * whether tier-required docs are *present and well-formed*. Blunt-but-enforced beats
 * subtle-but-trusted; that distinction is the whole point of this gate.
 *
 * Escape hatch (state-machine.md Section 12): label `vinaya/override:docs` on the PR, or set
 * env OVERRIDE_DOCS=1, skips the gate. Visible in the check log.
 *
 * CWD-independent by design: chdir's to the repo root immediately below. Every
 * relative path here (DOC_OWNERS_PATH, git diff/ls-files, readdirSync walks)
 * must resolve correctly regardless of the invoking process's own working
 * directory — this script is a sibling of verify-coherence.ts, which is
 * spawned as a subprocess without an explicit cwd (Vinaya Studio's API
 * routes, apps/vinaya-studio/web).
 */

import { execFileSync, execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  type DocsCoherenceEntry,
  evaluateDocsCoherence,
  evaluatePublishedProse,
  modelBackedDocPaths,
  parseDocFrontmatter,
  type PublishedProseEntry
} from '../src/docs'
import {
  type DoctrineContent,
  deriveDiagramModel,
  checkManifestValidity,
  DOC_OWNERS_PATH,
  deriveTierFromDiff,
  type DocOwnersBinding,
  evaluateC5,
  globToRegex,
  hasStatusBlock,
  isCodeFile,
  isDocFile,
  isSpecFile,
  isWaiverLabelActorVerified,
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
 * Array-form execFileSync — no shell, so no injection surface. `path` here
 * is a changed-file path drawn from `git diff --name-only`, which the PR
 * author fully controls (any file matching a doc-owners glob's suffix
 * regex, no character restriction) — unlike `sh()`'s other call sites in
 * this file, which only ever interpolate fixed literals or a
 * principal/CI-set `BASE_SHA`. A single-quoted `sh()` call here would let a
 * crafted filename (a stray `'`) break out of the quoting and run arbitrary
 * shell (security review, task 4). `base`/`path` are passed as
 * separate argv elements instead, so no value can ever reach a shell.
 */
function shFile(cmd: string, args: string[]): string {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}

/**
 * PR_BODY takes precedence when set (the PR-mode caller always sets it).
 * PR_BODY_FILE is the push-mode fallback for a branch with no PR yet — a
 * local path to the drafted PR body, so `Doc-ack:` lines are available
 * deterministically before the PR exists.
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
 * A waiver is honored only when the `vinaya/waiver:docs` label is present AND
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
    label: WAIVER_LABEL,
    labels,
    labelActor: process.env.WAIVER_LABEL_ACTOR || null,
    principalAllowlist: PRINCIPAL_ALLOWLIST
  })
}

/**
 * `base` must be the exact base ref the caller resolved `changed` against —
 * `runPrMode`'s local-run fallback (`origin/main` → `main`) means that ref
 * isn't always `BASE_SHA`/`origin/main` itself, and `Doc-neutral:`'s diff
 * evidence has to be read against the same range `changed` came from.
 * `--pr` and `--push` both funnel through this one function, so the
 * Doc-neutral evidence check is one predicate shared by both enforcement
 * points, not two implementations that can drift apart.
 */
function runC5(changed: string[], base: string): void {
  const content = existsSync(DOC_OWNERS_PATH) ? readFileSync(DOC_OWNERS_PATH, 'utf8') : null
  const getDiff = (path: string): string | null => {
    const out = shFile('git', ['diff', `${base}...HEAD`, '--', path])
    return out === '' ? null : out
  }
  const result = evaluateC5(changed, content, resolvePrBody(), existsSync, waiverActiveFromEnv(), getDiff)
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
    console.log('verify-docs: vinaya/override:docs active — gate skipped (logged for audit).')
    return
  }

  const base = process.env.BASE_SHA || 'origin/main'
  let effectiveBase = base
  let changed = sh(`git diff --name-only ${base}...HEAD`)
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

  if (changed.length === 0) {
    // Fallback for local runs without an explicit base.
    effectiveBase = 'main'
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
    notes.push(`no Tier field in PR body; derived Tier ${derived} from diff`)
    effectiveTier = derived
  }

  const codeFiles = changed.filter(isCodeFile)
  const docFiles = changed.filter(isDocFile)
  const specFiles = changed.filter(isSpecFile)

  // C1 — changed spec files must carry a Status block.
  for (const p of specFiles) {
    if (!existsSync(p)) continue // deleted
    if (!hasStatusBlock(readFileSync(p, 'utf8'))) {
      errors.push(
        `C1 spec-status: ${p} is missing a \`Status:\` block (accepted values: draft, target, ratified, retired). See state-machine.md Section 5.`
      )
    }
  }

  // C3 — code changes (tier 1+) must be accompanied by at least one doc change.
  if (effectiveTier !== 0 && codeFiles.length > 0 && docFiles.length === 0) {
    errors.push(
      `C3 code-requires-docs: ${codeFiles.length} code file(s) changed but no documentation file changed. Tier ${effectiveTier} work updates specs/skills/PM docs. If this is genuinely trivial, set \`Tier: 0\` in the PR body. (state-machine.md Section 9)`
    )
  }

  // C5 — code→doc coverage via .vinaya/doc-owners (dormant when absent).
  runC5(changed, effectiveBase)

  // C7 — published prose, scoped to the doctrine files this PR actually
  // changed. Blocking here (this is the gate CI runs); the repo-wide sweep is
  // full mode's job.
  runC7(new Set(changed.filter((p) => p.startsWith(AEG_ROOT_PREFIX) && p.endsWith('.md'))))
}

// ---- push mode (C5 only — ring-0 pre-push gate) -----------------------

function runPushMode(): void {
  if (
    overrideActive({
      overrideDocsEnv: process.env.OVERRIDE_DOCS,
      prLabels: process.env.PR_LABELS,
      prBody: resolvePrBody()
    })
  ) {
    console.log('verify-docs: vinaya/override:docs active — gate skipped (logged for audit).')
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
  runC5(changed, base)

  for (const n of notes) console.log(`verify-docs note: ${n}`)

  // Ring 0: warn-with-declared-intent, never a hard block. The push always
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

const AEG_ROOT_PREFIX = 'aeg-root/'

/**
 * The doctrine the `DiagramModel` derives from — raw `enforcement.md` + the
 * `roles/*.md` and `contracts/*.md` files, read here (a bin script does I/O)
 * and handed to the pure `deriveDiagramModel`. The surfaced-doc allowlist C6
 * checks against is model-backed, so C6 needs the same model
 * `/docs/reference` and `/docs/harness` render.
 */
function loadDoctrine(): DoctrineContent {
  const read = (p: string): string => (existsSync(p) ? readFileSync(p, 'utf8') : '')
  const list = (glob: string): string[] =>
    sh(`git ls-files '${glob}'`)
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
  return {
    enforcement: read('aeg-root/enforcement.md'),
    roles: list('aeg-root/roles/*.md').map((path) => ({ path, content: read(path) })),
    contracts: list('aeg-root/contracts/*.md').map((path) => ({ path, content: read(path) }))
  }
}

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

  const surfacedPaths = modelBackedDocPaths(deriveDiagramModel(loadDoctrine(), null, null))
  const result = evaluateDocsCoherence(entries, surfacedPaths)
  for (const e of result.errors) errors.push(e)
  for (const n of result.notes) notes.push(n)
}

/**
 * C7 — published-prose. The doctrine files under `aeg-root/` whose paths are
 * in `only` (PR mode: this diff's own changed files; full mode: every one) are
 * parsed and handed to the pure check together with the same model-backed
 * allowlist C6 uses, so the gate governs exactly what `/docs` publishes.
 */
function runC7(only?: ReadonlySet<string>): void {
  const files = sh("git ls-files 'aeg-root/*.md' 'aeg-root/roles/*.md' 'aeg-root/contracts/*.md'")
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((filePath) => (only ? only.has(filePath) : true))

  if (files.length === 0) return

  const entries: PublishedProseEntry[] = files.map((filePath) => {
    const raw = existsSync(filePath) ? readFileSync(filePath, 'utf8') : ''
    const parsed = parseDocFrontmatter(raw)
    return {
      relPath: filePath.slice(AEG_ROOT_PREFIX.length),
      frontmatter: parsed.frontmatter,
      body: parsed.body
    }
  })

  const surfacedPaths = modelBackedDocPaths(deriveDiagramModel(loadDoctrine(), null, null))
  const result = evaluatePublishedProse(entries, surfacedPaths)
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

  // C7 — published prose: repo-wide sweep of every surfaced doctrine doc.
  runC7()
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
    console.error(
      '\nFix the docs, or (Principal only) apply the vinaya/override:docs label. See state-machine.md Section 12.'
    )
    process.exit(1)
  }

  console.log(`verify-docs passed (${mode} mode).`)
  process.exit(0)
}

// ---- run -------------------------------------------------------------------

if (import.meta.main) {
  if (mode === 'pr') runPrMode()
  else if (mode === 'push') runPushMode()
  else runFullMode()

  finish()
}
