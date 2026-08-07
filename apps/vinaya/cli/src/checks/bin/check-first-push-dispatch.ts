#!/usr/bin/env bun

/**
 * Core check: first-push-dispatch. Thin adapter over `@atta/aeg-core`'s
 * `checkFirstPushDispatchGate` — mirrors `packages/aeg-core/bin/check-first-push-dispatch.ts`'s
 * gate shape (only evaluates on a task branch's genuinely first push, no PR
 * yet), emitting the check contract instead of human text.
 *
 * Documented divergence from the reference script: that script shells out
 * to `bun packages/aeg-core/bin/verify-dispatch.ts` — a path that exists
 * only inside THIS monorepo checkout, never in an arbitrary adopter repo
 * `vinaya init` installs into. This adapter instead classifies readiness
 * the same way the already-registered `dispatch-readiness` check does:
 * `checkDispatchReadiness` (`@atta/aeg-core`) fed with forge facts read via
 * `createForgeSource` (`@atta/vinaya-sources`) — the same
 * `@atta/aeg-core` + `@atta/vinaya-sources`-only boundary every check in
 * this directory already keeps. Same fail-open contract as the reference:
 * any forge-reachability failure classifies as `UNKNOWN`, which the pure
 * gate evaluator maps to `allow` — a transient outage must never block a
 * first push. `prExists` is self-derived via `gh pr list --head <branch>`
 * (the reference script instead trusts a caller-supplied flag; this adapter
 * has no such caller to trust, so it derives the same fact `dead-branch-push`
 * already derives the same way).
 *
 * scope: full — reads the live forge, not the local diff.
 */

import { execFileSync } from 'node:child_process'
import {
  checkDispatchReadiness,
  checkFirstPushDispatchGate,
  checkIssueRationale,
  fetchForgeFacts,
  fetchOpenIssuesByLabel,
  parseTaskBranch,
  type DispatchConflictsWithFact,
  type DispatchDependsOnFact,
  type DispatchGateInput,
  type DispatchReadinessFact
} from '@atta/aeg-core'
import { createForgeSource } from '@atta/vinaya-sources'
import { CHECK_SCHEMA_VERSION, emitCheckError } from '../contract'

const CHECK_NAME = 'first-push-dispatch'

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

function prExistsFor(branch: string): boolean {
  try {
    const out = execFileSync(
      'gh',
      ['pr', 'list', '--head', branch, '--state', 'all', '--json', 'number', '--limit', '1'],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      }
    )
    const entries = JSON.parse(out) as Array<{ number: number }>
    return entries.length > 0
  } catch {
    return false
  }
}

function resolveEdge(
  id: string,
  taskById: Map<string, { id: string; issue: number | null }>,
  factsByTaskId: Map<string, { prState: string }>
): { issue: number | null; merged: boolean; open: boolean } {
  const target = taskById.get(id)
  if (target) {
    const facts = target.issue !== null ? factsByTaskId.get(target.id) : undefined
    return { issue: target.issue, merged: facts?.prState === 'merged', open: facts?.prState === 'open' }
  }
  const direct = id.match(/^#(\d+)$/)
  return { issue: direct ? Number(direct[1]) : null, merged: false, open: false }
}

/** Best-effort readiness classification — any forge failure degrades to `UNKNOWN` (fail-open), never a thrown error. */
async function classifyReadiness(trancheSlug: string, taskId: string): Promise<DispatchReadinessFact> {
  const repo = resolveRepo()
  if (!repo) return 'UNKNOWN'

  try {
    const source = createForgeSource({ owner: repo.owner, repo: repo.repo })
    const tranche = await source.getTranche(trancheSlug)
    const task = tranche.tasks.find((t) => t.id === taskId)
    if (!task) return 'NOT_READY'

    const taskRefs = tranche.tasks.map((t) => ({ id: t.id, issue: t.issue }))
    const snapshot = await fetchForgeFacts({
      owner: repo.owner,
      repo: repo.repo,
      tranche: trancheSlug,
      tasks: taskRefs
    })

    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || ''
    const openIssuesBySlug = await fetchOpenIssuesByLabel([trancheSlug], repo.owner, repo.repo, token)
    const openIssues = openIssuesBySlug.get(trancheSlug) ?? []

    const issueFacts = task.issue !== null ? snapshot.facts.get(task.id) : undefined
    const issue =
      task.issue !== null && issueFacts
        ? { number: task.issue, state: (issueFacts.issueState === 'closed' ? 'closed' : 'open') as 'open' | 'closed' }
        : null

    const openIssueMatch = task.issue !== null ? openIssues.find((i) => i.number === task.issue) : undefined
    const issueRationalePass = openIssueMatch ? checkIssueRationale(openIssueMatch.body).status !== 'fail' : true

    const taskById = new Map(tranche.tasks.map((t) => [t.id, t]))
    const factsByTaskId = snapshot.facts

    const dependsOn: DispatchDependsOnFact[] = task.dependsOn.map((dep) => {
      const r = resolveEdge(dep, taskById, factsByTaskId)
      return { id: dep, issue: r.issue, merged: r.merged }
    })
    const conflictsWith: DispatchConflictsWithFact[] = task.conflictsWith.map((c) => {
      const r = resolveEdge(c, taskById, factsByTaskId)
      return { id: c, issue: r.issue, openOrInFlight: r.open }
    })

    const input: DispatchGateInput = {
      trancheSlug,
      task,
      issue,
      issueRationalePass,
      dependsOn,
      conflictsWith,
      priorTask: null,
      priorTrancheArchival: []
    }

    return checkDispatchReadiness(input).ready ? 'READY' : 'NOT_READY'
  } catch {
    return 'UNKNOWN'
  }
}

async function main(): Promise<void> {
  const branch = process.env.BRANCH || git(['rev-parse', '--abbrev-ref', 'HEAD'])
  const parsed = parseTaskBranch(branch)

  let readiness: DispatchReadinessFact = 'READY'
  let prExists = false

  if (parsed) {
    prExists = prExistsFor(branch)
    if (!prExists) readiness = await classifyReadiness(parsed.tranche, parsed.taskId)
  }

  const result = checkFirstPushDispatchGate({ branch, prExists, readiness })

  if (result.verdict === 'refuse') {
    emitCheckError({
      schema: CHECK_SCHEMA_VERSION,
      check: CHECK_NAME,
      severity: 'error',
      message: result.reason,
      agent_recovery_prompt:
        "Resolve the named dispatch blocker before this task branch's first push, then re-run `vinaya check first-push-dispatch`."
    })
    process.exit(1)
  }

  process.exit(0)
}

main()
