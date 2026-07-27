#!/usr/bin/env bun

/**
 * Core check: dispatch-readiness. Thin adapter over `@atta/aeg-core`'s
 * `checkDispatchReadiness` — mirrors `packages/aeg-core/bin/verify-dispatch.ts`'s
 * gate-mode input assembly, scoped to the CURRENT task branch (derived from
 * `BRANCH`/the current git branch, `task/<iteration>/<n>`) rather than every
 * task in the repo — the same branch-derived scoping
 * `packages/aeg-core/bin/verify-brief.ts`/`verify-coherence.ts` already use.
 *
 * Iteration state is read ONLY through a `StateSource`
 * (`createForgeSource` from `@atta/vinaya-sources`) — no hardcoded state
 * path (task 2's ratified corollary). Forge facts come only from the two
 * primitives `@atta/aeg-core` re-exports for this purpose: `fetchForgeFacts`
 * and `fetchOpenIssuesByLabel`.
 *
 * `resolveRepo`/token discovery below are NOT re-derivations of a governance
 * fact — they're the same small env-or-git-remote / env-or-`gh` recipe
 * `@atta/aeg-forge-state`'s `resolveRepo`/`resolveGithubToken` use, kept
 * local because those two functions are not re-exported from `@atta/aeg-core`
 * (aeg-core-purity, #521) and this task's dependency boundary is
 * `@atta/aeg-core` + `@atta/vinaya-sources` only.
 *
 * Known scope gap (recorded in the PR body): `priorIterationArchival` is
 * always reported empty. Resolving it for real requires
 * `listActiveIterationSlugs` to discover candidate prior iterations per
 * project — not among the forge primitives this task's boundary re-exports.
 * Passing an empty list makes that one predicate trivially pass rather than
 * re-typing the fact via a second implementation; it is a real (if narrow)
 * parity gap versus `bin/verify-dispatch.ts`, not silently equivalent to it.
 *
 * scope: full — reads the live forge, not the local diff.
 */

import { execFile, execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import {
  checkDispatchReadiness,
  checkIssueRationale,
  fetchForgeFacts,
  fetchOpenIssuesByLabel,
  type DispatchConflictsWithFact,
  type DispatchDependsOnFact,
  type DispatchGateInput,
  type DispatchPriorIterationFact
} from '@atta/aeg-core'
import { createForgeSource } from '@atta/vinaya-sources'
import { CHECK_SCHEMA_VERSION, emitCheckError } from '../contract'

const CHECK_NAME = 'dispatch-readiness'
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../../../..')
process.chdir(REPO_ROOT)

const execFileAsync = promisify(execFile)

// Array-form execFileSync — no shell, so no injection surface even though
// today's arguments are fixed literals.
function git(args: string[]): string {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim()
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

function currentBranch(): string {
  return process.env.BRANCH || git(['rev-parse', '--abbrev-ref', 'HEAD'])
}

function fail(message: string, prompt: string): never {
  emitCheckError({
    schema: CHECK_SCHEMA_VERSION,
    check: CHECK_NAME,
    severity: 'error',
    message,
    agent_recovery_prompt: prompt
  })
  process.exit(1)
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
  // Cross-iteration / #NNN reference — unresolvable with this check's forge
  // toolset (fetchForgeFacts/fetchOpenIssuesByLabel only). Conservative
  // default matches `bin/verify-dispatch.ts`'s own fallback for the same case.
  const direct = id.match(/^#(\d+)$/)
  return { issue: direct ? Number(direct[1]) : null, merged: false, open: false }
}

async function main(): Promise<void> {
  const branch = currentBranch()
  const m = branch.match(/^task\/([^/]+)\/(.+)$/)
  if (!m) {
    // Non-task branch — nothing scoped to evaluate. Mirrors verify-brief.ts's bypass.
    process.exit(0)
  }
  const iterationSlug = m[1] as string
  const taskId = m[2] as string

  const repo = resolveRepo()
  if (!repo) {
    fail(
      'dispatch-gate severity:infra — could not resolve owner/repo.',
      'Set AEG_REPO=owner/repo, or confirm `git remote get-url origin` resolves to a GitHub URL, then re-run `vinaya check dispatch-readiness`.'
    )
  }

  const source = createForgeSource({ owner: repo.owner, repo: repo.repo })
  let iteration: Awaited<ReturnType<typeof source.getIteration>>
  try {
    iteration = await source.getIteration(iterationSlug)
  } catch (err) {
    fail(
      `dispatch-gate severity:infra — could not derive iteration "${iterationSlug}" from the forge: ${(err as Error).message}`,
      'Confirm `gh auth status` passes and the iteration has a Milestone + labeled Issues on the forge, then re-run this check.'
    )
  }

  const task = iteration.tasks.find((t) => t.id === taskId)
  if (!task) {
    fail(
      `dispatch-gate row-existence: task "${taskId}" is not present in iteration "${iterationSlug}"'s forge-derived task list.`,
      'Confirm the branch name matches a real, forge-registered task id, or wait for the Planner to open the task Issue before re-running.'
    )
  }

  const taskRefs = iteration.tasks.map((t) => ({ id: t.id, issue: t.issue }))
  const snapshot = await fetchForgeFacts({
    owner: repo.owner,
    repo: repo.repo,
    iteration: iterationSlug,
    tasks: taskRefs
  })

  const token = (await resolveToken()) ?? ''
  const openIssuesBySlug = await fetchOpenIssuesByLabel([iterationSlug], repo.owner, repo.repo, token)
  const openIssues = openIssuesBySlug.get(iterationSlug) ?? []

  const issueFacts = task.issue !== null ? snapshot.facts.get(task.id) : undefined
  const issue =
    task.issue !== null && issueFacts
      ? { number: task.issue, state: (issueFacts.issueState === 'closed' ? 'closed' : 'open') as 'open' | 'closed' }
      : null

  // Rationale is only checkable when the issue's body is available — the
  // OPEN-issues-by-label fetch is the only forge primitive this check has for
  // issue bodies. A closed issue's body is unavailable through it; defaulting
  // to pass in that case is a scoped decision (see module doc comment / PR body).
  const openIssueMatch = task.issue !== null ? openIssues.find((i) => i.number === task.issue) : undefined
  const issueRationalePass = openIssueMatch ? checkIssueRationale(openIssueMatch.body).status !== 'fail' : true

  const taskById = new Map(iteration.tasks.map((t) => [t.id, t]))
  const factsByTaskId = snapshot.facts

  const dependsOn: DispatchDependsOnFact[] = task.dependsOn.map((dep) => {
    const r = resolveEdge(dep, taskById, factsByTaskId)
    return { id: dep, issue: r.issue, merged: r.merged }
  })
  const conflictsWith: DispatchConflictsWithFact[] = task.conflictsWith.map((c) => {
    const r = resolveEdge(c, taskById, factsByTaskId)
    return { id: c, issue: r.issue, openOrInFlight: r.open }
  })

  const priorIterationArchival: DispatchPriorIterationFact[] = []

  const input: DispatchGateInput = {
    iterationSlug,
    task,
    issue,
    issueRationalePass,
    dependsOn,
    conflictsWith,
    priorTask: null,
    priorIterationArchival
  }

  const result = checkDispatchReadiness(input)

  if (!result.ready) {
    for (const blocker of result.blockers) {
      emitCheckError({
        schema: CHECK_SCHEMA_VERSION,
        check: CHECK_NAME,
        severity: 'error',
        message: blocker,
        agent_recovery_prompt: recoveryPromptFor(blocker)
      })
    }
    process.exit(1)
  }

  process.exit(0)
}

/** Tailors the instruction to `checkDispatchReadiness`'s own `dispatch-gate <category>:` blocker prefixes, rather than one canned prompt for every failure type. */
function recoveryPromptFor(blocker: string): string {
  if (blocker.startsWith('dispatch-gate issue-existence:')) {
    return 'This task has no resolvable Issue yet. Wait for the Planner to cut the Issue (or fix the phantom reference in the topology), then re-run `vinaya check dispatch-readiness`.'
  }
  if (blocker.startsWith('dispatch-gate rationale:')) {
    return "The task's Issue fails the rationale gate. Ask the Planner to complete the eight-field rationale on the Issue body, then re-run `vinaya check dispatch-readiness`."
  }
  if (blocker.startsWith('dispatch-gate depends-on:')) {
    return 'A declared dependency is not merged yet. Do not start this task — wait for the named dependency PR to merge, then re-run `vinaya check dispatch-readiness`.'
  }
  if (blocker.startsWith('dispatch-gate conflicts-with:')) {
    return 'A declared conflicting task has an open or in-flight PR. Wait for it to merge before continuing, then re-run `vinaya check dispatch-readiness`.'
  }
  if (blocker.startsWith('dispatch-gate prior-iteration-archival:')) {
    return "This project's previous iteration is not archived. Ask the Iteration Archivist to run first, then re-run `vinaya check dispatch-readiness`."
  }
  return 'Resolve the named dispatch blocker before continuing work on this task, then re-run `vinaya check dispatch-readiness`.'
}

main()
