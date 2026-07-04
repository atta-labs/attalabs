#!/usr/bin/env bun

/**
 * verify-dispatch — the deterministic pre-work gate (aeg-governance-hardening
 * task 11, #324). Mechanizes the prose entry-gate items `roles/developer.md`
 * currently asks every Developer to re-derive by hand — the exact gap the
 * 2026-07-02/03 dispatch wave proved live (four agents independently
 * re-derived, and stopped on, the same archival fact; one walked through the
 * same prose gate others stopped on; one hit two push-time dead ends).
 *
 * Thin CLI/I/O shim, same discipline as `verify-docs.ts`/`verify-coherence.ts`:
 * resolves args, reads freshly-fetched forge/git state, and calls the pure
 * evaluators homed in `@atta/aeg-core` (`checkDispatchReadiness`,
 * `classifyLeftover`, `captureBaseline`/`compareToBaseline`,
 * `parsePremiseBlock`/`checkPremises`). No check logic lives here.
 *
 * One implementation per fact (§11 constraint) — reuses `parseIteration`,
 * `hasProvenance`, `taskRefFromBranch`, `checkIssueRationale`, and
 * `fetchProvenance` (imported from `verify-coherence.ts`, where it is already
 * exported — not re-implemented here).
 *
 * Usage:
 *   bun packages/aeg-core/bin/verify-dispatch.ts <iteration> <n>
 *   bun packages/aeg-core/bin/verify-dispatch.ts <iteration> <n> --premise <body-file>
 *   bun packages/aeg-core/bin/verify-dispatch.ts <iteration> <n> --simulate <body-file>
 *   bun packages/aeg-core/bin/verify-dispatch.ts <iteration> <n> --check-baseline <file>
 *
 * Modes:
 *   (default)         Forge dispatch-readiness gate + leftover-branch
 *                      classification + a baseline capture (informational —
 *                      the standing contract is "≤ captured baseline", never
 *                      "must be green", D-074/live-fire #2).
 *   --premise <file>   Re-assert every `Premise:` pin in the given body file
 *                      against the current on-disk state. A failed premise
 *                      is a stop condition, not a silent re-guess
 *                      (contracts/brief-developer.md).
 *   --simulate <file>  Dry-run the exit gates BEFORE work starts: verify-brief
 *                      + verify-docs --pr + push-mode C5, all against the
 *                      intended body file. No diff exists yet at this point,
 *                      so premise *coverage* (which needs real changed files)
 *                      is not evaluated here — only that the Premise: block
 *                      parses to at least one assertion.
 *   --check-baseline <file>  Compare current verify-docs/verify-coherence
 *                      finding counts against a previously captured baseline
 *                      file (JSON array of `BaselineEntry`). Fails if any
 *                      tool regressed past its baseline. A tool that could
 *                      not run at all (crash, unparseable output) is never
 *                      compared as if it scored 0 — it fails the check
 *                      outright (fail-closed: no signal means no pass).
 *
 * Exit code: 0 when ready (and, in --premise/--simulate/--check-baseline
 * mode, when that mode's check passes); 1 otherwise, with every failing
 * predicate printed by name.
 *
 * CWD-independent by design: chdir's to the repo root immediately below.
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { resolveGithubToken } from '../../../apps/aeg/web/studio/src/lib/forge/github-token'
import { resolveRepo } from '../../../apps/aeg/web/studio/src/lib/forge/resolve-repo'
import {
  type BaselineEntry,
  captureBaseline,
  checkDispatchReadiness,
  checkIssueRationale,
  checkPremises,
  classifyLeftover,
  compareToBaseline,
  type DispatchConflictsWithFact,
  type DispatchDependsOnFact,
  type DispatchPriorIterationFact,
  type DispatchPriorTaskFact,
  parseIteration,
  parsePremiseBlock
} from '../src/index'
import type { Iteration, Task } from '../src/types'
import { fetchProvenance } from './verify-coherence'

const REPO_ROOT = join(import.meta.dirname, '../../..')
process.chdir(REPO_ROOT)

// ---- I/O helpers -------------------------------------------------------------

function sh(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}

function shJson<T>(cmd: string): T | null {
  const out = sh(cmd)
  if (!out) return null
  try {
    return JSON.parse(out) as T
  } catch {
    return null
  }
}

type IssueJson = { number: number; state: 'OPEN' | 'CLOSED'; body: string; labels: Array<{ name: string }> }

const issueCache = new Map<number, IssueJson | null>()

function ghIssueView(num: number): IssueJson | null {
  if (issueCache.has(num)) return issueCache.get(num) ?? null
  const result = shJson<IssueJson>(`gh issue view ${num} --json number,state,body,labels`)
  issueCache.set(num, result)
  return result
}

type PrListEntry = { number: number; headRefName: string; state: 'OPEN' | 'CLOSED' | 'MERGED'; mergedAt: string | null }

/** One batched fetch of every PR (any state) whose head branch belongs to this iteration. */
function fetchIterationBranchPrs(iterationSlug: string): Map<string, PrListEntry> {
  const all = shJson<PrListEntry[]>('gh pr list --state all --json number,headRefName,state,mergedAt --limit 300') ?? []
  const prefix = `task/${iterationSlug}/`
  const map = new Map<string, PrListEntry>()
  for (const pr of all) {
    if (!pr.headRefName.startsWith(prefix)) continue
    const taskId = pr.headRefName.slice(prefix.length)
    map.set(taskId, pr)
  }
  return map
}

// ---- iteration / task resolution ---------------------------------------------

function readIterationFromOrigin(iterationSlug: string): Iteration | null {
  sh('git fetch origin main --quiet')
  const path = `aeg-root/iterations/${iterationSlug}.md`
  let md: string
  try {
    md = execSync(`git show origin/main:${path}`, { encoding: 'utf8' })
  } catch {
    return null
  }
  return parseIteration(md)
}

/** `#NNN` or a prose cell containing `#NNN` (e.g. cross-iteration "other-iter #264"). */
function directIssueNumFromEdge(edge: string): number | null {
  const m = edge.match(/#(\d+)/)
  return m ? Number(m[1]) : null
}

function resolveSameIterationTask(edge: string, iteration: Iteration): Task | undefined {
  return iteration.tasks.find((t) => t.id === edge.trim())
}

function resolveDependsOn(
  edges: string[],
  iteration: Iteration,
  branchPrs: Map<string, PrListEntry>
): DispatchDependsOnFact[] {
  return edges.map((edge) => {
    const sameTask = resolveSameIterationTask(edge, iteration)
    if (sameTask) {
      const pr = branchPrs.get(sameTask.id)
      if (pr) return { id: edge, issue: sameTask.issue, merged: pr.state === 'MERGED' }
      if (sameTask.issue !== null) {
        const issueJson = ghIssueView(sameTask.issue)
        return { id: edge, issue: sameTask.issue, merged: issueJson?.state === 'CLOSED' }
      }
      return { id: edge, issue: null, merged: false }
    }
    const directIssue = directIssueNumFromEdge(edge)
    if (directIssue !== null) {
      const issueJson = ghIssueView(directIssue)
      return { id: edge, issue: directIssue, merged: issueJson?.state === 'CLOSED' }
    }
    // Unresolvable edge (neither a same-iteration task id nor a #NNN ref) —
    // conservative default: treat as unmerged so dispatch blocks rather than
    // silently proceeding. Known limitation, see PR body.
    return { id: edge, issue: null, merged: false }
  })
}

function resolveConflictsWith(
  edges: string[],
  iteration: Iteration,
  branchPrs: Map<string, PrListEntry>
): DispatchConflictsWithFact[] {
  return edges.map((edge) => {
    const sameTask = resolveSameIterationTask(edge, iteration)
    if (sameTask) {
      const pr = branchPrs.get(sameTask.id)
      return { id: edge, issue: sameTask.issue, openOrInFlight: pr ? pr.state === 'OPEN' : false }
    }
    const directIssue = directIssueNumFromEdge(edge)
    // No branch-PR knowledge for a cross-iteration edge — default to
    // not-blocking (a conflict only matters if a PR genuinely exists and is
    // open; we have no evidence of one). Known limitation, see PR body.
    return { id: edge, issue: directIssue, openOrInFlight: false }
  })
}

function resolvePriorTask(
  iteration: Iteration,
  taskId: string,
  branchPrs: Map<string, PrListEntry>,
  provenanceByIssue: Map<number, boolean>
): DispatchPriorTaskFact | null {
  const idx = iteration.tasks.findIndex((t) => t.id === taskId)
  if (idx <= 0) return null
  const prior = iteration.tasks[idx - 1] as Task
  const pr = branchPrs.get(prior.id)
  const issueJson = prior.issue !== null ? ghIssueView(prior.issue) : null
  return {
    id: prior.id,
    issue: prior.issue,
    issueClosed: issueJson?.state === 'CLOSED',
    prMerged: pr?.state === 'MERGED',
    hasProvenance: prior.issue !== null ? (provenanceByIssue.get(prior.issue) ?? false) : false
  }
}

const ITERATIONS_DIR = join(REPO_ROOT, 'aeg-root/iterations')

function otherActiveIterationSlugs(excludeSlug: string): string[] {
  if (!existsSync(ITERATIONS_DIR)) return []
  return sh(`ls ${ITERATIONS_DIR}`)
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.endsWith('.md') && s !== `${excludeSlug}.md`)
    .map((s) => s.replace(/\.md$/, ''))
}

/** One entry per project named in `projects`: the first active, all-Issues-closed prior iteration found, or a null-slug pass-through when none is found. */
function resolvePriorIterationArchival(projects: string[], excludeSlug: string): DispatchPriorIterationFact[] {
  const candidates = otherActiveIterationSlugs(excludeSlug)
  const facts: DispatchPriorIterationFact[] = []

  for (const project of projects) {
    let found: DispatchPriorIterationFact | null = null
    for (const slug of candidates) {
      const path = join(ITERATIONS_DIR, `${slug}.md`)
      if (!existsSync(path)) continue
      const candidateIteration = parseIteration(readFileSync(path, 'utf8'))
      const touchesProject = candidateIteration.tasks.some((t) => t.projects.includes(project))
      if (!touchesProject) continue

      const openIssues =
        shJson<Array<{ number: number }>>(
          `gh issue list --label "iteration:${slug}" --state open --json number --limit 100`
        ) ?? []
      if (openIssues.length === 0) {
        found = { project, priorIterationSlug: slug, archived: false }
        break
      }
    }
    facts.push(found ?? { project, priorIterationSlug: null, archived: false })
  }

  return facts
}

// ---- leftover detection -------------------------------------------------------

function computeLeftover(iterationSlug: string, taskId: string) {
  const branch = `task/${iterationSlug}/${taskId}`
  const worktreeDir = join(REPO_ROOT, '.worktrees', 'task', iterationSlug, taskId)
  const branchExistsRemote = sh(`git ls-remote --heads origin ${branch}`).length > 0
  const worktreeExistsLocal = existsSync(worktreeDir)

  let commitsAheadOfMain = 0
  if (branchExistsRemote) {
    sh(`git fetch origin ${branch} --quiet`)
    const count = sh(`git rev-list --count origin/main..origin/${branch}`)
    commitsAheadOfMain = count && !Number.isNaN(Number(count)) ? Number(count) : 0
  } else if (worktreeExistsLocal) {
    const count = sh(`git -C ${worktreeDir} rev-list --count origin/main..HEAD`)
    commitsAheadOfMain = count && !Number.isNaN(Number(count)) ? Number(count) : 0
  }

  return classifyLeftover({ branchExistsRemote, worktreeExistsLocal, commitsAheadOfMain })
}

// ---- baseline capture ----------------------------------------------------------

type CaptureResult = { output: string; exitCode: number; ranAtAll: boolean }

/**
 * Non-throwing combined stdout+stderr capture, used ONLY by
 * `currentFindingCounts()`. `sh()`/`shJson()` above deliberately swallow any
 * non-zero exit to `''` — every other call site of theirs relies on that
 * ("not found / not applicable"). Finding counts need the opposite: a
 * non-zero exit from `verify-docs`/`verify-coherence` means "here are the
 * findings," not "nothing to report," so this helper harvests output
 * regardless of exit code instead of throwing it away. `2>&1` merges stderr
 * into the captured stream — both tools' finding output lands there, and
 * neither tool writes anything to stderr on its clean/`--json` path, so nothing
 * gets corrupted by the merge.
 */
function captureCombinedOutput(cmd: string): CaptureResult {
  try {
    const output = execSync(`${cmd} 2>&1`, { encoding: 'utf8' })
    return { output, exitCode: 0, ranAtAll: true }
  } catch (err) {
    const e = err as { stdout?: unknown; status?: number | null }
    if (typeof e.stdout === 'string') {
      return { output: e.stdout, exitCode: typeof e.status === 'number' ? e.status : 1, ranAtAll: true }
    }
    // No captured stdout at all (e.g. spawn failure) — the process never produced output to count.
    return { output: '', exitCode: -1, ranAtAll: false }
  }
}

function parseJsonSafe<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

type FindingCount = { tool: string; findingCount: number; unavailable: boolean }

/**
 * Counts findings regardless of exit code — `verify-docs` and
 * `verify-coherence --json` both exit non-zero exactly when findings exist
 * (a normal, parseable run), which is the case that was previously
 * misreported as 0 (see module docstring). "Unavailable" (tool crashed /
 * produced no parseable output) is reported explicitly and is never folded
 * into the numeric count — see `docsUnavailable`/`coherenceUnavailable` below.
 */
export function currentFindingCounts(): FindingCount[] {
  const docs = captureCombinedOutput('bun packages/aeg-core/bin/verify-docs.ts')
  const docsFindingCount = docs.ranAtAll ? countErrorLines(docs.output) : 0
  // verify-docs's own contract: exit 1 iff errors.length > 0 (bin/verify-docs.ts).
  // A non-zero exit with zero ✗ lines means it crashed before reaching that
  // contract, not that it ran and found nothing.
  const docsUnavailable = !docs.ranAtAll || (docs.exitCode !== 0 && docsFindingCount === 0)

  const coherence = captureCombinedOutput('bun packages/aeg-core/bin/verify-coherence.ts --json')
  const coherenceParsed = coherence.ranAtAll ? parseJsonSafe<{ summary: { failed: number } }>(coherence.output) : null
  const coherenceUnavailable = !coherence.ranAtAll || coherenceParsed === null
  const coherenceFindingCount = coherenceParsed?.summary.failed ?? 0

  return [
    { tool: 'verify-docs-full', findingCount: docsFindingCount, unavailable: docsUnavailable },
    { tool: 'verify-coherence', findingCount: coherenceFindingCount, unavailable: coherenceUnavailable }
  ]
}

function countErrorLines(output: string): number {
  return output.split('\n').filter((l) => l.trim().startsWith('✗')).length
}

// ---- modes ---------------------------------------------------------------------

function runPremiseMode(bodyFile: string): void {
  const body = readFileSync(bodyFile, 'utf8')
  const assertions = parsePremiseBlock(body)
  if (assertions.length === 0) {
    console.log('verify-dispatch --premise: no `Premise:` assertions found in the body file — nothing to re-assert.')
    process.exit(0)
  }
  const result = checkPremises(assertions, (p) => (existsSync(p) ? readFileSync(p, 'utf8') : null))
  if (!result.pass) {
    console.error(`\nverify-dispatch --premise FAILED — ${result.failures.length} premise(s) no longer hold:\n`)
    for (const f of result.failures) console.error(`  ✗ ${f}`)
    process.exit(1)
  }
  console.log(`verify-dispatch --premise: all ${assertions.length} premise(s) re-asserted successfully.`)
  process.exit(0)
}

function runSimulateMode(iterationSlug: string, taskId: string, bodyFile: string): void {
  const branch = `task/${iterationSlug}/${taskId}`
  const body = readFileSync(bodyFile, 'utf8')
  const assertions = parsePremiseBlock(body)
  console.log(
    assertions.length > 0
      ? `verify-dispatch --simulate: Premise: block present (${assertions.length} assertion(s)).`
      : 'verify-dispatch --simulate: WARNING — no `Premise:` block found in the body file (checkPremiseCoverage will fail at PR time if this task has a code surface).'
  )

  let failed = false
  const gates: Array<[string, () => void]> = [
    [
      'verify-brief',
      () =>
        execSync('bun packages/aeg-core/bin/verify-brief.ts', {
          env: { ...process.env, BRANCH: branch, PR_BODY: body },
          stdio: 'inherit'
        })
    ],
    [
      'verify-docs --pr',
      () =>
        execSync('bun packages/aeg-core/bin/verify-docs.ts --pr', {
          env: { ...process.env, PR_BODY: body },
          stdio: 'inherit'
        })
    ],
    [
      'verify-docs --push (C5, via PR_BODY_FILE)',
      () =>
        execSync('bun packages/aeg-core/bin/verify-docs.ts --push', {
          env: { ...process.env, PR_BODY_FILE: bodyFile },
          stdio: 'inherit'
        })
    ]
  ]

  for (const [label, run] of gates) {
    try {
      run()
      console.log(`verify-dispatch --simulate: ${label} PASS.`)
    } catch {
      console.error(`verify-dispatch --simulate: ${label} FAILED (output above).`)
      failed = true
    }
  }

  process.exit(failed ? 1 : 0)
}

function runCheckBaselineMode(baselineFile: string): void {
  const baseline = JSON.parse(readFileSync(baselineFile, 'utf8')) as BaselineEntry[]
  const current = currentFindingCounts()

  // Fail-closed: an unavailable tool carries no honest count, so it is never
  // fed into compareToBaseline's numeric comparison as if it scored 0 — that
  // would silently pass a regression the tool simply failed to observe.
  const unavailable = current.filter((c) => c.unavailable)
  if (unavailable.length > 0) {
    console.error('\nverify-dispatch --check-baseline FAILED — tool(s) produced no honest count to compare:')
    for (const u of unavailable) console.error(`  ✗ ${u.tool}: UNAVAILABLE (tool failed to run)`)
    console.error(
      '\nAn unavailable tool is never compared as if it scored 0. Fix the tool, then re-run --check-baseline.'
    )
    process.exit(1)
  }

  const comparison = compareToBaseline(
    current.map(({ tool, findingCount }) => ({ tool, findingCount })),
    baseline
  )
  console.log(JSON.stringify(comparison, null, 2))
  if (!comparison.withinBudget) {
    console.error('\nverify-dispatch --check-baseline FAILED — one or more tools regressed past their baseline.')
    process.exit(1)
  }
  console.log('\nverify-dispatch --check-baseline: within budget.')
  process.exit(0)
}

async function runGateMode(iterationSlug: string, taskId: string): Promise<void> {
  const iteration = readIterationFromOrigin(iterationSlug)
  if (!iteration) {
    console.error(
      `verify-dispatch row-existence: aeg-root/iterations/${iterationSlug}.md not found on a freshly-fetched origin/main.`
    )
    process.exit(1)
  }

  const task = (iteration as Iteration).tasks.find((t) => t.id === taskId)
  if (!task) {
    console.error(
      `verify-dispatch row-existence: task "${taskId}" is not present in aeg-root/iterations/${iterationSlug}.md on a freshly-fetched origin/main — the plan PR that adds it has not merged. Not dispatchable until it does.`
    )
    process.exit(1)
  }

  const repo = await resolveRepo()
  const token = await resolveGithubToken()
  if (!repo || !token) {
    console.error(
      'verify-dispatch severity:infra — could not resolve a GitHub repo/token (set AEG_REPO / GITHUB_TOKEN, or `gh auth login`). Cannot evaluate forge-dependent predicates.'
    )
    process.exit(1)
  }

  const issueJson = task.issue !== null ? ghIssueView(task.issue) : null
  const issueRationalePass = issueJson ? checkIssueRationale(issueJson.body).status === 'pass' : true

  const branchPrs = fetchIterationBranchPrs(iterationSlug)
  const dependsOn = resolveDependsOn(task.dependsOn, iteration as Iteration, branchPrs)
  const conflictsWith = resolveConflictsWith(task.conflictsWith, iteration as Iteration, branchPrs)

  const priorTaskRaw = resolvePriorTaskRaw(iteration as Iteration, taskId)
  let provenanceByIssue = new Map<number, boolean>()
  if (priorTaskRaw?.issue !== null && priorTaskRaw !== null) {
    provenanceByIssue = await fetchProvenance([priorTaskRaw.issue as number], repo.owner, repo.repo, token)
  }
  const priorTask = resolvePriorTask(iteration as Iteration, taskId, branchPrs, provenanceByIssue)

  const priorIterationArchival = resolvePriorIterationArchival(task.projects, iterationSlug)

  const gateResult = checkDispatchReadiness({
    iterationSlug,
    task,
    issue:
      task.issue !== null && issueJson
        ? { number: task.issue, state: issueJson.state === 'OPEN' ? 'open' : 'closed' }
        : null,
    issueRationalePass,
    dependsOn,
    conflictsWith,
    priorTask,
    priorIterationArchival
  })

  const leftover = computeLeftover(iterationSlug, taskId)

  const rawCounts = currentFindingCounts()
  const nowIso = sh('git log -1 --format=%cI') || new Date(0).toISOString()
  const capturedBaseline = captureBaseline(
    rawCounts.map(({ tool, findingCount }) => ({ tool, findingCount })),
    nowIso
  )

  console.log(`\nverify-dispatch: ${iterationSlug} task ${taskId}\n`)
  console.log(`dispatch-readiness: ${gateResult.ready ? 'READY' : 'NOT READY'}`)
  for (const b of gateResult.blockers) console.log(`  ✗ ${b}`)

  console.log(`\nleftover-detection: ${leftover.verdict}`)
  console.log(`  ${leftover.reason}`)

  console.log('\nbaseline (informational — captured this run, not a committed file):')
  for (const raw of rawCounts) {
    const captured = capturedBaseline.find((b) => b.tool === raw.tool)
    const capturedAt = captured?.capturedAt ?? nowIso
    console.log(
      raw.unavailable
        ? `  ${raw.tool}: UNAVAILABLE (tool failed to run) at ${capturedAt}`
        : `  ${raw.tool}: ${raw.findingCount} finding(s) at ${capturedAt}`
    )
  }

  const overallReady = gateResult.ready && leftover.verdict !== 'stop'
  console.log(`\nverify-dispatch: ${overallReady ? 'READY TO DISPATCH' : 'NOT READY'}`)
  process.exit(overallReady ? 0 : 1)
}

/** Raw prior-task lookup (before forge facts are attached) — used only to know which Issue to batch-fetch provenance for. */
function resolvePriorTaskRaw(iteration: Iteration, taskId: string): Task | null {
  const idx = iteration.tasks.findIndex((t) => t.id === taskId)
  if (idx <= 0) return null
  return (iteration.tasks[idx - 1] as Task) ?? null
}

// ---- CLI entry point -----------------------------------------------------------

if (import.meta.main) {
  const argv = process.argv.slice(2)
  const iterationSlug = argv[0]
  const taskId = argv[1]

  if (!iterationSlug || !taskId || iterationSlug.startsWith('--')) {
    console.error(
      'Usage: verify-dispatch <iteration> <n> [--premise <file>] [--simulate <file>] [--check-baseline <file>]'
    )
    process.exit(1)
  }

  const premiseIdx = argv.indexOf('--premise')
  const simulateIdx = argv.indexOf('--simulate')
  const checkBaselineIdx = argv.indexOf('--check-baseline')

  if (premiseIdx !== -1) {
    const file = argv[premiseIdx + 1]
    if (!file) {
      console.error('--premise requires a body-file path.')
      process.exit(1)
    }
    runPremiseMode(file)
  } else if (simulateIdx !== -1) {
    const file = argv[simulateIdx + 1]
    if (!file) {
      console.error('--simulate requires a body-file path.')
      process.exit(1)
    }
    runSimulateMode(iterationSlug, taskId, file)
  } else if (checkBaselineIdx !== -1) {
    const file = argv[checkBaselineIdx + 1]
    if (!file) {
      console.error('--check-baseline requires a baseline-file path.')
      process.exit(1)
    }
    runCheckBaselineMode(file)
  } else {
    await runGateMode(iterationSlug, taskId)
  }
}
