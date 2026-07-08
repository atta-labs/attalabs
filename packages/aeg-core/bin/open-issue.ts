#!/usr/bin/env bun

/**
 * open-issue — the ONLY sanctioned way to create or body-edit an Issue in
 * this repo (D-078). The `check-forge-gates.sh` PreToolUse hook denies raw
 * `gh issue create` / `gh issue edit --body*`, directing every agent here.
 *
 * Gate: a task Issue (any `iteration:<slug>` label) must carry the full
 * eight-field Planner's rationale in its body (`checkIssueRationale`,
 * planner-brief contract, D-055) — refused locally otherwise, before anything
 * reaches the forge. Non-task Issues (no iteration label) pass through
 * unvalidated: the rationale contract does not apply to them.
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
 *   bun packages/aeg-core/bin/open-issue.ts --title t --body-file <path> --label iteration:x [gh args...]
 *   bun packages/aeg-core/bin/open-issue.ts edit <n> --body-file <path> [gh args...]
 *   bun packages/aeg-core/bin/open-issue.ts --validate-only --body-file <path> --label iteration:x
 */

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { findMilestoneForSlug, type MilestoneFacts } from '@atta/aeg-forge-state'
import { checkForgeTitle } from '../src/brief-validation'
import { checkIssueRationale, isTaskIssueLabelSet } from '../src/issue-validation'

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

/** First `iteration:<slug>` label's slug, or `null` when the set carries none. */
function iterationSlugFromLabels(labels: string[]): string | null {
  const label = labels.find((l) => l.startsWith('iteration:'))
  return label ? label.slice('iteration:'.length) : null
}

/** True when argv already carries an explicit `--milestone`/`-m` flag — the caller's choice always wins. */
function hasExplicitMilestoneFlag(args: string[]): boolean {
  return args.some((a) => a === '--milestone' || a === '-m' || a.startsWith('--milestone='))
}

/**
 * Milestone auto-attach on Issue CREATE (aeg-review-gate-v1 task 1 follow-up).
 * `deriveIterationFromForge`/`listActiveIterationSlugs` (`@atta/aeg-forge-state`)
 * never read an Issue's GitHub-native milestone field — only the
 * `iteration:<slug>` label — so this drift was never functionally
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

export function main(): void {
  const argv = process.argv.slice(2)
  const validateOnly = argv.includes('--validate-only')
  const args = argv.filter((a) => a !== '--validate-only')

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
    const title = extractTitle(bodyArgs)
    if (title !== null) {
      const t = checkForgeTitle(title)
      if (t.status === 'fail') fail(t.errors[0] as string)
    }
    if (body === null) {
      fail('a task Issue (iteration:* label) requires a `--body-file <path>` so the rationale gate can validate it.')
    }
    console.log('[open-issue] task Issue (iteration label) — validating the Planner rationale…')
    const { status, errors } = checkIssueRationale(body)
    if (status === 'fail') {
      console.error(`\n[open-issue] FAILED — ${errors.length} rationale field(s) missing:\n`)
      for (const e of errors) console.error(`  ✗ ${e}`)
      fail('the Issue body does not carry the full eight-field Planner rationale (planner-brief contract, D-055).')
    }
    console.log('[open-issue] rationale gate PASS.')
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
