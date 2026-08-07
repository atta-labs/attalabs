#!/usr/bin/env bun

/**
 * Core check: coherence. Thin adapter over `@atta/aeg-core`'s coherence
 * evaluators — mirrors `packages/aeg-core/bin/verify-coherence.ts`'s
 * forge-fact assembly, but scoped to the CURRENT task branch's tranche
 * only (derived from `BRANCH`/the current git branch), the same
 * branch-derived scoping `verify-coherence.ts`'s own `ciTrancheSlug`
 * already uses for T2/T3.
 *
 * Tranche state is read ONLY through a `StateSource`
 * (`createForgeSource`). Forge facts come only from the two primitives this
 * task's boundary re-exports from `@atta/aeg-core`: `fetchForgeFacts` and
 * `fetchOpenIssuesByLabel`.
 *
 * Known scope gap (recorded in the PR body): this check runs A1, A3, T1, T2,
 * T3, D1, R1, L1 (and the always-info L3) — the checks whose required facts
 * are obtainable from the two forge primitives above. It does NOT run A2
 * (needs `fetchProvenance`, not re-exported), or L2/L4/L5 (need
 * `listActiveTrancheSlugs`/`listIssueMilestonesForSlug`, not re-exported).
 * A2/L2/L4/L5 are genuinely unavailable to this check's dependency boundary,
 * not re-derived — a narrower but honest scope versus `verify-coherence.ts`.
 *
 * scope: full — reads the live forge, not the local diff.
 */

import { execFile, execFileSync } from 'node:child_process'
import { promisify } from 'node:util'
import {
  checkA1,
  checkA3,
  checkD1,
  checkL1,
  checkL3,
  checkR1,
  checkT1,
  checkT2,
  checkT3,
  fetchForgeFacts,
  fetchOpenIssuesByLabel,
  R1_GRANDFATHERED_ISSUES,
  scopeT2ToPlanPr,
  type CheckResult,
  type TrancheFile,
  type TaskEntry
} from '@atta/aeg-core'
import { createForgeSource } from '@atta/vinaya-sources'
import { CHECK_SCHEMA_VERSION, emitCheckError } from '../contract'

const CHECK_NAME = 'coherence'

// No chdir: the only cwd-dependent work here is `git(...)` shelling out for
// the caller's own remote/branch, and the runner's spawn already inherits
// the caller's cwd — which IS the repo `vinaya check` is meant to evaluate.
// A chdir here previously pointed at wherever this SCRIPT lives (this
// monorepo from source, or the CLI's own install location once bundled),
// never the target repo — silently leaking this repo's own tranche/branch
// facts into whatever repo actually invoked the check.
const execFileAsync = promisify(execFile)

// Array-form execFileSync — no shell, so no injection surface even though
// today's arguments are fixed literals. `stdio: ['ignore', 'pipe', 'pipe']`
// is load-bearing, not cosmetic: without it, a git call THIS FUNCTION
// EXPECTS TO FAIL AND CATCHES (e.g. `rev-parse --abbrev-ref HEAD` on an
// unborn HEAD — a fresh repo's very first commit, before any tranche
// branch exists) still inherits stderr and writes its raw, non-JSON text
// onto the check's own stderr stream. The runner (`runner.ts`) treats every
// stderr line as a `CheckError` JSON candidate; one non-JSON line sets
// `malformed = true` and reports `status: 'error'` regardless of the
// check's real exit code — misreporting a correct, silent, exit-0 bypass
// as a crash. Found live 2026-08-07: this exact gap made `vinaya check
// --all` refuse a brand-new adopter repo's very first commit (the
// pre-commit hook treats `error` as a failure), even though this
// function's own JS-level handling of the unborn-HEAD case was already
// correct. Every other check bin's `git()` helper already pipes stderr
// this way — `check-doc-coverage.ts` names the same reasoning explicitly.
function git(args: string[]): string {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  } catch {
    return ''
  }
}

function resolveRepo(): { owner: string; repo: string } | null {
  const fromEnv = process.env.AEG_REPO
  if (fromEnv) {
    const m = fromEnv.match(/^([^/]+)\/(.+)$/)
    if (m?.[1] && m[2]) return { owner: m[1], repo: m[2] }
  }
  const url = git(['remote', 'get-url', 'origin'])
  const ssh = url.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/)
  if (ssh?.[1] && ssh[2]) return { owner: ssh[1], repo: ssh[2] }
  const https = url.match(/^https?:\/\/(?:[^@]+@)?github\.com\/([^/]+)\/(.+?)(?:\.git)?\/?$/)
  if (https?.[1] && https[2]) return { owner: https[1], repo: https[2] }
  return null
}

async function resolveToken(): Promise<string | null> {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN
  try {
    const { stdout } = await execFileAsync('gh', ['auth', 'token'])
    const token = stdout.trim()
    return token.length > 0 ? token : null
  } catch {
    return null
  }
}

function currentTrancheSlug(): string | null {
  const branch = process.env.BRANCH || git(['rev-parse', '--abbrev-ref', 'HEAD'])
  const m = branch.match(/^task\/([^/]+)\//)
  return m?.[1] ?? null
}

function issueToEntry(entries: TaskEntry[]): Map<number, TaskEntry> {
  const m = new Map<number, TaskEntry>()
  for (const e of entries) if (e.task.issue !== null) m.set(e.task.issue, e)
  return m
}

function taskToEntry(entries: TaskEntry[], slug: string): Map<string, TaskEntry> {
  const m = new Map<string, TaskEntry>()
  for (const e of entries) m.set(`${slug}/${e.task.id}`, e)
  return m
}

/** Tailors the instruction to the specific coherence check code that fired, rather than one canned prompt for every failure class. */
function recoveryPromptFor(checkCode: string): string {
  switch (checkCode) {
    case 'A1':
      return "The task's Issue is closed but its closing PR is not merged. Verify the PR actually merged (or reopen the Issue if it was closed in error), then re-run `vinaya check coherence`."
    case 'A3':
      return 'The closing PR merged but the Issue is still open (a GitHub auto-close misfire). Manually close the Issue, then re-run `vinaya check coherence`.'
    case 'T1':
      return "The topology names an Issue number that doesn't resolve on the forge. Fix the Issue number in the topology, or ask the Planner to re-cut it, then re-run `vinaya check coherence`."
    case 'T2':
      return "An open Issue under this tranche's label is missing from the topology. Add its row to the tranche's task list, then re-run `vinaya check coherence`."
    case 'T3':
      return 'A task in this active tranche has no Issue (#TBD). Ask the Planner to cut the Issue, then re-run `vinaya check coherence`.'
    case 'D1':
      return "This task has an open PR but a declared dependency isn't closed. Close the dependency first (or verify it truly is), then re-run `vinaya check coherence`."
    case 'R1':
      return 'The Issue fails the rationale gate. Ask the Planner to complete the eight-field rationale on the Issue body, then re-run `vinaya check coherence`.'
    default:
      return 'Read the named coherence failure and resolve the underlying forge/topology drift it names, then re-run `vinaya check coherence`.'
  }
}

function emitFailure(result: CheckResult): void {
  const detail = result.failures.map((f) => f.reason).join(' | ') || result.note || 'see check output'
  emitCheckError({
    schema: CHECK_SCHEMA_VERSION,
    check: CHECK_NAME,
    severity: 'error',
    message: `${result.check}: ${detail}`,
    agent_recovery_prompt: recoveryPromptFor(result.check)
  })
}

async function main(): Promise<void> {
  const slug = currentTrancheSlug()
  if (!slug) {
    // Non-task branch — nothing scoped to check. Mirrors verify-brief.ts's bypass.
    process.exit(0)
  }

  const repo = resolveRepo()
  if (!repo) {
    emitCheckError({
      schema: CHECK_SCHEMA_VERSION,
      check: CHECK_NAME,
      severity: 'error',
      message: 'coherence severity:infra — could not resolve owner/repo.',
      agent_recovery_prompt:
        'Set AEG_REPO=owner/repo, or confirm `git remote get-url origin` resolves to a GitHub URL, then re-run `vinaya check coherence`.'
    })
    process.exit(1)
  }

  const source = createForgeSource({ owner: repo.owner, repo: repo.repo })
  const tranche = await source.getTranche(slug)
  const file: TrancheFile = { slug, archived: false, tranche }

  const baseEntries: TaskEntry[] = tranche.tasks.map((t) => ({
    trancheSlug: slug,
    archived: false,
    task: t,
    facts: undefined
  }))

  const taskRefs = tranche.tasks.filter((t) => t.issue !== null).map((t) => ({ id: t.id, issue: t.issue as number }))
  const snapshot = await fetchForgeFacts({ owner: repo.owner, repo: repo.repo, tranche: slug, tasks: taskRefs })

  const results: CheckResult[] = [checkL3([file])]

  if (snapshot.unavailable) {
    emitCheckError({
      schema: CHECK_SCHEMA_VERSION,
      check: CHECK_NAME,
      severity: 'error',
      message: `coherence severity:infra — forge facts unavailable for tranche "${slug}": ${snapshot.reason ?? 'unknown'}`,
      agent_recovery_prompt:
        'Confirm `gh auth status` passes and the forge is reachable, then re-run `vinaya check coherence`.'
    })
    process.exit(1)
  }

  const enrichedEntries: TaskEntry[] = tranche.tasks.map((t) => ({
    trancheSlug: slug,
    archived: false,
    task: t,
    facts: snapshot.facts.get(t.id)
  }))

  results.push(checkA1(enrichedEntries))
  results.push(checkA3(enrichedEntries))
  results.push(checkT1(enrichedEntries))
  results.push(checkD1(enrichedEntries, issueToEntry(enrichedEntries), taskToEntry(enrichedEntries, slug)))
  results.push(checkT3(baseEntries, slug, enrichedEntries, new Set()))
  results.push(checkL1([file], new Map([[slug, enrichedEntries]])))

  const token = (await resolveToken()) ?? ''
  const openIssuesBySlug = await fetchOpenIssuesByLabel([slug], repo.owner, repo.repo, token)
  const topologyIssues = new Set(tranche.tasks.map((t) => t.issue).filter((n): n is number => n !== null))
  const openNums = (openIssuesBySlug.get(slug) ?? []).map((i) => i.number)
  results.push(scopeT2ToPlanPr(checkT2(new Map([[slug, openNums]]), new Map([[slug, topologyIssues]]), slug), false))
  results.push(checkR1(openIssuesBySlug, R1_GRANDFATHERED_ISSUES))

  const failed = results.filter((r) => r.status === 'fail')
  if (failed.length > 0) {
    for (const r of failed) emitFailure(r)
    process.exit(1)
  }

  process.exit(0)
}

main()
