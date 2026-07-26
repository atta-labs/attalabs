#!/usr/bin/env bun

/**
 * open-issue — the ONLY sanctioned way to create or body-edit an Issue in
 * this repo. The `check-forge-gates.sh` PreToolUse hook denies raw
 * `gh issue create` / `gh issue edit --body*`, directing every agent here.
 *
 * Gate: a task Issue (any `vinaya/iteration:<slug>` label) must carry the full
 * eight-field Planner's rationale in its body (`checkIssueRationale`,
 * planner-brief contract) — refused locally otherwise, before anything
 * reaches the forge. Non-task Issues (no iteration label) pass through
 * unvalidated: the rationale contract does not apply to them.
 *
 * Content gate: past presence, three checks grade what those fields
 * SAY against the surface the task touches, and refuse — `checkBlastRadiusScope`
 * (a shared collision domain from `.aeg/packages` that no declared project
 * owns, without a second project or a `blast-radius-ack:` line),
 * `checkNoBriefContent` (brief-shaped sections belong in the brief, not here),
 * `checkRationaleNamesDocs` (name a doc/skill path, or the `no-doc-surface`
 * sentinel — the only read-obligation signal a forge write leaves, since the
 * skill-check hook fires on file edits and this edits none).
 * `checkConflictCompleteness` warns on an undeclared collision-domain overlap
 * and never blocks. All four apply to task Issues only, same as the rationale
 * gate.
 *
 * Label detection is per-path: on `create`, labels come from this command's
 * own argv (`--label` flags are naturally present there). On `edit`, argv is
 * silent — nobody re-passes `--label` when changing a body — so the target
 * Issue's ACTUAL current labels are fetched from the forge
 * (`gh issue view <n> --json labels`) and unioned with any argv labels. A
 * failed forge fetch is a hard refusal, never treated as "no iteration
 * label" (#417).
 *
 * Usage:
 *   bun packages/aeg-core/bin/open-issue.ts --title t --body-file <path> --label "vinaya/iteration:x" [gh args...]
 *   bun packages/aeg-core/bin/open-issue.ts edit <n> --body-file <path> [gh args...]
 *   bun packages/aeg-core/bin/open-issue.ts --validate-only --body-file <path> --label "vinaya/iteration:x"
 */

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  amendRationaleDeps,
  findIterationSlug,
  findMilestoneForSlug,
  iterationLabel,
  iterationSlugLengthError,
  type MilestoneFacts,
  parseRationaleDeps
} from '@atta/aeg-forge-state'
import { checkForgeTitle } from '../src/brief-validation'
import {
  checkBlastRadiusScope,
  checkConflictCompleteness,
  checkIssueRationale,
  checkNoBriefContent,
  checkRationaleNamesDocs,
  isTaskIssueLabelSet,
  type ProjectPath,
  type TaskIssueFacts
} from '../src/issue-validation'
import { parseRegistry } from '../src/parse-registry'

const REPO_ROOT = join(import.meta.dirname, '../../..')
process.chdir(REPO_ROOT)

function fail(msg: string): never {
  console.error(`\n[open-issue] REFUSED — ${msg}`)
  console.error('[open-issue] Nothing was sent to the forge. Fix the body and retry.')
  process.exit(1)
}

/** Where a validated body's bytes came from — a file/stream path, or an inline arg value. */
export type BodySource = { kind: 'file'; argIndex: number; inlineForm: boolean } | { kind: 'inline' }

export interface BodyResult {
  body: string
  source: BodySource
}

/**
 * Reads the body exactly once and records where it came from. `argIndex` +
 * `inlineForm` let `resolveShippableArgs` find and replace the same slot
 * later — the read here and the value shipped to `gh` must be the same
 * buffered string, not two independent reads of the same path.
 */
export function locateBody(args: string[]): BodyResult | null {
  for (let i = 0; i < args.length; i++) {
    const a = args[i] as string
    if (a === '--body-file' || a === '-F') {
      const p = args[i + 1]
      if (!p) fail('`--body-file` given with no path.')
      return { body: readFileSync(p, 'utf8'), source: { kind: 'file', argIndex: i + 1, inlineForm: false } }
    }
    if (a.startsWith('--body-file=')) {
      const p = a.slice('--body-file='.length)
      return { body: readFileSync(p, 'utf8'), source: { kind: 'file', argIndex: i, inlineForm: true } }
    }
    if (a === '--body' || a === '-b') {
      const v = args[i + 1]
      if (v === undefined) fail('`--body` given with no value.')
      return { body: v, source: { kind: 'inline' } }
    }
    if (a.startsWith('--body=')) return { body: a.slice('--body='.length), source: { kind: 'inline' } }
  }
  return null
}

/**
 * Materializes an already-buffered body into a fresh temp file and rewrites
 * the `--body-file`/`-F` slot to point at it, so `gh`'s own read sees the
 * SAME bytes this process validated — never a second read of the original
 * path (which is empty for a stream by the time `gh` opens it). Inline
 * `--body`/`-b` args are untouched: no file, no second read, no risk.
 */
export function resolveShippableArgs(
  args: string[],
  bodyResult: BodyResult | null
): { finalArgs: string[]; cleanup: () => void } {
  if (bodyResult?.source.kind !== 'file') {
    return { finalArgs: args, cleanup: () => {} }
  }
  const dir = mkdtempSync(join(tmpdir(), 'aeg-open-issue-body-'))
  const tempPath = join(dir, 'body.md')
  writeFileSync(tempPath, bodyResult.body, 'utf8')
  const finalArgs = [...args]
  const { argIndex, inlineForm } = bodyResult.source
  finalArgs[argIndex] = inlineForm ? `--body-file=${tempPath}` : tempPath
  return { finalArgs, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

/** Extracts --title/-t value from the passthrough args, if present. */
function extractTitle(args: string[]): string | null {
  for (let i = 0; i < args.length; i++) {
    const a = args[i] as string
    if (a === '--title' || a === '-t') return args[i + 1] ?? null
    if (a.startsWith('--title=')) return a.slice('--title='.length)
  }
  return null
}

function extractLabels(args: string[]): string[] {
  const labels: string[] = []
  for (let i = 0; i < args.length; i++) {
    const a = args[i] as string
    if (a === '--label' || a === '-l') {
      const v = args[i + 1]
      if (v) labels.push(...v.split(',').map((s) => s.trim()))
    }
    if (a.startsWith('--label='))
      labels.push(
        ...a
          .slice('--label='.length)
          .split(',')
          .map((s) => s.trim())
      )
    if (a.startsWith('--add-label='))
      labels.push(
        ...a
          .slice('--add-label='.length)
          .split(',')
          .map((s) => s.trim())
      )
    if (a === '--add-label') {
      const v = args[i + 1]
      if (v) labels.push(...v.split(',').map((s) => s.trim()))
    }
  }
  return labels
}

/**
 * Fetches the target Issue's actual current labels from the forge. Edit
 * invocations don't normally re-pass `--label` flags, so argv says nothing
 * about whether the target is a task Issue — the forge is the only truthful
 * source (#417). Fails loud/closed: a failed fetch is never treated as "no
 * iteration label", which would silently re-open the exact bypass this
 * function exists to close.
 */
function fetchForgeLabels(issueRef: string): string[] {
  let out: string
  try {
    out = execFileSync('gh', ['issue', 'view', issueRef, '--json', 'labels'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })
  } catch {
    fail(
      `could not fetch Issue ${issueRef}'s labels from the forge (\`gh issue view\`) — the rationale gate cannot decide whether it applies. Check gh auth/network and retry; refusing to pass the edit through unvalidated.`
    )
  }
  try {
    const parsed = JSON.parse(out) as { labels: Array<{ name: string }> }
    return parsed.labels.map((l) => l.name)
  } catch {
    fail(
      `could not parse \`gh issue view ${issueRef} --json labels\` output — refusing to pass the edit through unvalidated.`
    )
  }
}

/** First `vinaya/iteration:<slug>` label's slug, or `null` when the set carries none. */
function iterationSlugFromLabels(labels: string[]): string | null {
  return findIterationSlug(labels)
}

/** True when argv already carries an explicit `--milestone`/`-m` flag — the caller's choice always wins. */
function hasExplicitMilestoneFlag(args: string[]): boolean {
  return args.some((a) => a === '--milestone' || a === '-m' || a.startsWith('--milestone='))
}

/**
 * Milestone auto-attach on Issue CREATE (aeg-review-gate-v1 task 1 follow-up).
 * `deriveIterationFromForge`/`listActiveIterationSlugs` (`@atta/aeg-forge-state`)
 * never read an Issue's GitHub-native milestone field — only the
 * `vinaya/iteration:<slug>` label — so this drift was never functionally
 * load-pathing; it is pure GitHub-view hygiene (a Milestone showing
 * `open_issues=0` while 3 real open task Issues carry its label). Creation-time
 * only, by design: `edit` never force-attaches retroactively (an unrelated
 * body edit must not silently reassign an Issue's milestone).
 *
 * Not a hard failure when no matching Milestone exists yet — an iteration's
 * Milestone may not exist yet at first-Issue-cut time (task 5/#429 backfilled
 * Milestones after the fact for the first cohort; a brand-new iteration's
 * very first Issue necessarily precedes its own Milestone in some workflows).
 * `lookupMilestone` is injected so this stays testable without a real `gh` call.
 */
export function resolveMilestoneToAttach(
  labels: string[],
  args: string[],
  isEdit: boolean,
  lookupMilestone: (slug: string) => MilestoneFacts | null
): string | null {
  if (isEdit) return null
  if (!isTaskIssueLabelSet(labels)) return null
  if (hasExplicitMilestoneFlag(args)) return null
  const slug = iterationSlugFromLabels(labels)
  if (!slug) return null
  const milestone = lookupMilestone(slug)
  if (milestone?.lifecycle !== 'active') return null
  return slug
}

// ---------- amend-deps subcommand --------------------------------------------
//
// `amend-deps` is the ONLY sanctioned way to change a task Issue's dependency
// edges (Issue #481, drift class #1). It rewrites the structured
// `Dependency rationale` field AND appends the matching `**Amendment (...)**`
// paragraph in ONE atomic write (`amendRationaleDeps`), with a runtime
// round-trip parse gate — closing the five-incident class this session where
// the field and a later free-form amendment drifted apart because nothing
// forced them to change together. Modeled on's "the sanctioned path is
// the only path": there is no code path here that rewrites one representation
// without the other.

/** Parses one edge-set flag value into ids. The empty markers (`—`/`–`/`-`/``) yield `[]`. */
export function parseEdgeFlag(value: string): string[] {
  const t = value.trim()
  if (t === '' || t === '—' || t === '–' || t === '-') return []
  return t
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/** Order-sensitive edge-set equality — the round-trip gate's core predicate. */
export function edgesEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

export type AmendDepsFlags = {
  issue: string | null
  dependsOn?: string[]
  conflictsWith?: string[]
  note: string
  actor: string
  dryRun: boolean
}

/**
 * Parses the `amend-deps` subcommand's own flags (its body is composed, never
 * accepted, so `locateBody` is deliberately NOT reused here). A field flag that
 * is absent leaves `dependsOn`/`conflictsWith` `undefined` (untouched);
 * present-but-empty yields `[]` (the explicit `—` marker).
 */
export function parseAmendArgs(args: string[]): AmendDepsFlags {
  const flags: AmendDepsFlags = { issue: null, note: '', actor: 'Planner', dryRun: false }
  for (let i = 0; i < args.length; i++) {
    const a = args[i] as string
    const valueFor = (name: string): string => {
      if (a.startsWith(`${name}=`)) return a.slice(name.length + 1)
      const v = args[i + 1] ?? ''
      i++
      return v
    }
    if (a === '--dry-run') flags.dryRun = true
    else if (a === '--depends-on' || a.startsWith('--depends-on='))
      flags.dependsOn = parseEdgeFlag(valueFor('--depends-on'))
    else if (a === '--conflicts-with' || a.startsWith('--conflicts-with='))
      flags.conflictsWith = parseEdgeFlag(valueFor('--conflicts-with'))
    else if (a === '--note' || a.startsWith('--note=')) flags.note = valueFor('--note')
    else if (a === '--actor' || a.startsWith('--actor=')) flags.actor = valueFor('--actor') || 'Planner'
    else if (!a.startsWith('-') && flags.issue === null) flags.issue = a
  }
  return flags
}

/** Static flag validation. Returns a refusal message, or `null` when the flags are well-formed. */
export function validateAmendFlags(flags: AmendDepsFlags): string | null {
  if (flags.issue === null) return 'amend-deps requires the target Issue number as the first argument.'
  if (flags.dependsOn === undefined && flags.conflictsWith === undefined) {
    return 'amend-deps requires at least one of `--depends-on` / `--conflicts-with`.'
  }
  if (flags.note.trim() === '') return 'amend-deps requires a non-empty `--note` (the why for the amendment).'
  return null
}

/** IO seams for {@link runAmendDeps}, injected so the orchestrator is testable without a real `gh`. */
export type AmendDepsDeps = {
  fetchLabels: (issue: string) => string[]
  fetchBody: (issue: string) => string
  editBody: (issue: string, newBody: string) => void
  today: () => string
  log: (msg: string) => void
  fail: (msg: string) => never
}

/**
 * The `amend-deps` orchestrator. Every real invocation is gated on a runtime
 * round-trip parse (`parseRationaleDeps(newBody)` must deep-equal the requested
 * sets) — the rewrite is NEVER trusted by construction. This is the exact
 * "test against real data, not assumptions" trap (Issue #481) enforced on
 * every invocation forever.
 */
export function runAmendDeps(flags: AmendDepsFlags, deps: AmendDepsDeps): void {
  const err = validateAmendFlags(flags)
  if (err) deps.fail(err)
  const issue = flags.issue as string

  const labels = deps.fetchLabels(issue)
  if (!isTaskIssueLabelSet(labels)) {
    deps.fail(`amend-deps targets task Issues only — Issue ${issue} carries no \`vinaya/iteration:*\` label.`)
  }

  const body = deps.fetchBody(issue)
  const before = parseRationaleDeps(body)

  const input = {
    note: flags.note,
    date: deps.today(),
    actor: flags.actor,
    ...(flags.dependsOn !== undefined ? { dependsOn: flags.dependsOn } : {}),
    ...(flags.conflictsWith !== undefined ? { conflictsWith: flags.conflictsWith } : {})
  }

  let newBody: string
  try {
    newBody = amendRationaleDeps(body, input)
  } catch (e) {
    deps.fail(`amend-deps could not rewrite Issue ${issue}: ${(e as Error).message}`)
  }

  // Round-trip gate (hard) — the writer and parser must agree on the grammar.
  const after = parseRationaleDeps(newBody)
  if (flags.dependsOn !== undefined && !edgesEqual(after.dependsOn, flags.dependsOn)) {
    deps.fail(
      `amend-deps round-trip FAILED for Depends-on: requested [${flags.dependsOn.join(', ')}] but parseRationaleDeps read back [${after.dependsOn.join(', ')}]. Nothing written.`
    )
  }
  if (flags.conflictsWith !== undefined && !edgesEqual(after.conflictsWith, flags.conflictsWith)) {
    deps.fail(
      `amend-deps round-trip FAILED for Conflicts-with: requested [${flags.conflictsWith.join(', ')}] but parseRationaleDeps read back [${after.conflictsWith.join(', ')}]. Nothing written.`
    )
  }

  // Rationale gate — the amended body must still carry the full rationale.
  const rationale = checkIssueRationale(newBody)
  if (rationale.status === 'fail') {
    deps.fail(
      `amend-deps: the amended body no longer passes the rationale gate (${rationale.errors.join(' | ')}). Nothing written.`
    )
  }

  if (flags.dryRun) {
    deps.log(newBody)
    deps.log('round-trip PASS')
    return
  }

  deps.editBody(issue, newBody)
  if (flags.dependsOn !== undefined) {
    deps.log(`[open-issue] Depends-on: [${before.dependsOn.join(', ')}] → [${after.dependsOn.join(', ')}]`)
  }
  if (flags.conflictsWith !== undefined) {
    deps.log(`[open-issue] Conflicts-with: [${before.conflictsWith.join(', ')}] → [${after.conflictsWith.join(', ')}]`)
  }
}

// ---------- content gate I/O (A/B/D block, C warns) --------------------------
//
// `issue-validation.ts` stays pure; every disk/forge read the content checks
// need happens here.

/**
 * The static collision-domain list (`.aeg/packages`) — one path prefix per
 * line, `#` comments and blanks ignored.
 *
 * **Absent file ⇒ empty list ⇒ check A dormant**, deliberately, and the same
 * dormant-when-absent seam `doc-owners` uses. A is only deterministic with a
 * source of truth; with none, the honest behavior is not to run rather than to
 * invent a shared-package list inline and block on a guess.
 */
function readSharedPackages(): string[] {
  try {
    return readFileSync(join(REPO_ROOT, '.aeg/packages'), 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#'))
  } catch {
    return []
  }
}

/** Registry rows (`projects.md`) — the authority for which project owns which path. Absent ⇒ nothing is owned. */
function readProjectPaths(): ProjectPath[] {
  try {
    return parseRegistry(readFileSync(join(REPO_ROOT, '.vinaya/projects.md'), 'utf8'))
  } catch {
    return []
  }
}

/**
 * The iteration's other open task Issues, for check C. Best-effort by design:
 * C is warn-only, so a forge hiccup must degrade to "no warning", never to a
 * refusal — the opposite of `fetchForgeLabels`, which fails closed because a
 * missing label there would silently skip a *blocking* gate.
 */
function fetchSiblingTaskIssues(slug: string, selfRef: string | null): TaskIssueFacts[] {
  try {
    // Labels are filtered CLIENT-side, deliberately. `gh issue list --label
    // vinaya/iteration:<slug>` returns an empty set against this repo's live labels
    // even though the label exists and Issues carry it (reproduced on
    // `vinaya/iteration:vinaya-pages-v2`: 11 matching open Issues, `--label` yields
    // 0). Server-side filtering would have shipped C permanently silent and
    // indistinguishable from "no overlap" — the exact false-green shape this
    // whole change exists to remove. Listing open Issues and matching here is
    // one request either way.
    const out = execFileSync(
      'gh',
      ['issue', 'list', '--state', 'open', '--limit', '200', '--json', 'number,body,labels'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 32 * 1024 * 1024 }
    )
    return (JSON.parse(out) as Array<{ number: number; body: string; labels: Array<{ name: string }> }>)
      .filter((i) => i.labels.some((l) => l.name === iterationLabel(slug)))
      .filter((i) => String(i.number) !== String(selfRef ?? '').replace(/^#/, ''))
      .map((i) => ({
        ref: `#${i.number}`,
        body: i.body ?? '',
        conflictsWith: parseRationaleDeps(i.body ?? '').conflictsWith
      }))
  } catch {
    console.warn('[open-issue] could not list sibling task Issues — skipping the conflict-completeness warning (C).')
    return []
  }
}

/** Fetches an Issue's current body from the forge — hard refusal on fetch/parse failure (#417 pattern). */
function fetchForgeBody(issueRef: string): string {
  let out: string
  try {
    out = execFileSync('gh', ['issue', 'view', issueRef, '--json', 'body'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })
  } catch {
    fail(
      `could not fetch Issue ${issueRef}'s body from the forge (\`gh issue view\`). Check gh auth/network and retry; refusing to amend blind.`
    )
  }
  try {
    return (JSON.parse(out) as { body: string }).body
  } catch {
    fail(`could not parse \`gh issue view ${issueRef} --json body\` output — refusing to amend blind.`)
  }
}

/** Ships an amended body through the SAME same-bytes edit machinery `edit` uses (`resolveShippableArgs`). */
function ghEditBody(issueRef: string, newBody: string): void {
  const bodyResult: BodyResult = { body: newBody, source: { kind: 'file', argIndex: 1, inlineForm: false } }
  const { finalArgs, cleanup } = resolveShippableArgs(['--body-file', '__amend_placeholder__'], bodyResult)
  try {
    const out = execFileSync('gh', ['issue', 'edit', issueRef, ...finalArgs], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit']
    })
    console.log(out.trim())
  } finally {
    cleanup()
  }
}

export function main(): void {
  const argv = process.argv.slice(2)
  const validateOnly = argv.includes('--validate-only')
  const args = argv.filter((a) => a !== '--validate-only')

  if (args[0] === 'amend-deps') {
    runAmendDeps(parseAmendArgs(args.slice(1)), {
      fetchLabels: fetchForgeLabels,
      fetchBody: fetchForgeBody,
      editBody: ghEditBody,
      today: () => new Date().toISOString().slice(0, 10),
      log: (m) => console.log(m),
      fail
    })
    return
  }

  const isEdit = args[0] === 'edit'
  const ghArgs = isEdit ? args.slice(1) : args
  const bodyArgs = isEdit ? ghArgs.slice(1) : ghArgs

  const bodyResult = locateBody(bodyArgs)
  const body = bodyResult?.body ?? null
  let labels = extractLabels(bodyArgs)
  if (isEdit) {
    const issueRef = ghArgs[0]
    if (!issueRef || issueRef.startsWith('-')) {
      fail('edit mode requires the target Issue number/URL as the first argument after `edit`.')
    }
    const forgeLabels = fetchForgeLabels(issueRef)
    console.log(`[open-issue] edit — Issue ${issueRef} carries ${forgeLabels.length} label(s) on the forge.`)
    labels = [...new Set([...forgeLabels, ...labels])]
  }

  if (isTaskIssueLabelSet(labels)) {
    // GitHub caps a label name at 50 characters and `vinaya/iteration:` spends
    // 17 of them, so a slug that reads fine in prose can be one the forge
    // refuses to create. Caught here — the first place a new iteration's label
    // reaches the forge — rather than as an opaque `gh` 422 later.
    const labelSlug = iterationSlugFromLabels(labels)
    if (labelSlug !== null) {
      const lengthError = iterationSlugLengthError(labelSlug)
      if (lengthError) fail(`open-issue label-length: ${lengthError}`)
    }

    const title = extractTitle(bodyArgs)
    if (title !== null) {
      const t = checkForgeTitle(title)
      if (t.status === 'fail') fail(t.errors[0] as string)
    }
    if (body === null) {
      fail(
        'a task Issue (vinaya/iteration:* label) requires a `--body-file <path>` so the rationale gate can validate it.'
      )
    }
    console.log('[open-issue] task Issue (iteration label) — validating the Planner rationale…')
    const { status, errors } = checkIssueRationale(body)
    if (status === 'fail') {
      console.error(`\n[open-issue] FAILED — ${errors.length} rationale field(s) missing:\n`)
      for (const e of errors) console.error(`  ✗ ${e}`)
      fail('the Issue body does not carry the full eight-field Planner rationale (planner-brief contract, D-055).')
    }
    console.log('[open-issue] rationale gate PASS.')

    // ---- content gate: A/B/D block, C warns --------------------------------
    // The rationale gate above proves the eight fields EXIST. These prove what
    // they say is consistent with the surface the task touches — the three
    // failure classes that passed the presence gate on #621/#622/#626.
    const sharedPackages = readSharedPackages()
    if (sharedPackages.length === 0) {
      console.warn('[open-issue] no `.aeg/packages` collision-domain list — blast-radius check (A) is dormant.')
    }
    const contentErrors = [
      ...checkBlastRadiusScope(body, labels, sharedPackages, readProjectPaths()).errors,
      ...checkNoBriefContent(body).errors,
      ...checkRationaleNamesDocs(body).errors
    ]
    if (contentErrors.length > 0) {
      console.error(`\n[open-issue] FAILED — ${contentErrors.length} content check(s):\n`)
      for (const e of contentErrors) console.error(`  ✗ ${e}`)
      fail('the Issue body fails the blast-radius / brief-content / docs-read checks.')
    }
    console.log('[open-issue] content gate PASS (blast radius, brief content, docs read).')

    // C — warn-only. Never blocks: an Issue declares no precise file surface,
    // so an overlapping collision domain is a hint, not a fact.
    const slug = iterationSlugFromLabels(labels)
    if (slug) {
      const selfRef = isEdit ? (ghArgs[0] as string) : null
      const conflictWarnings = checkConflictCompleteness(
        {
          ref: selfRef ? `#${selfRef.replace(/^#/, '')}` : '(new)',
          body,
          conflictsWith: parseRationaleDeps(body).conflictsWith
        },
        fetchSiblingTaskIssues(slug, selfRef),
        sharedPackages
      )
      for (const w of conflictWarnings) console.warn(`[open-issue] WARNING — ${w}`)
    }
  } else {
    console.log('[open-issue] no iteration label — rationale gate does not apply, passing through.')
  }

  if (validateOnly) {
    console.log('[open-issue] --validate-only: stopping before gh.')
    process.exit(0)
  }

  const milestoneSlug = resolveMilestoneToAttach(labels, bodyArgs, isEdit, (slug) => {
    try {
      return findMilestoneForSlug('{owner}', '{repo}', slug)
    } catch {
      console.warn(`[open-issue] milestone lookup for "${slug}" failed (gh api) — creating without --milestone.`)
      return null
    }
  })
  const createArgs = milestoneSlug ? [...bodyArgs, '--milestone', milestoneSlug] : bodyArgs
  if (milestoneSlug) {
    console.log(`[open-issue] auto-attaching to open Milestone "${milestoneSlug}" (iteration label match).`)
  }

  const { finalArgs, cleanup } = resolveShippableArgs(createArgs, bodyResult)
  try {
    const finalGhArgs = isEdit ? [ghArgs[0] as string, ...finalArgs] : finalArgs
    const ghCmd = isEdit ? ['issue', 'edit', ...finalGhArgs] : ['issue', 'create', ...finalGhArgs]
    const out = execFileSync('gh', ghCmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
    console.log(out.trim())
  } finally {
    cleanup()
  }
}

if (import.meta.main) {
  main()
}
