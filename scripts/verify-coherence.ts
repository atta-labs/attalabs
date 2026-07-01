#!/usr/bin/env bun

/**
 * verify-coherence — deterministic plan↔forge coherence oracle.
 *
 * Detects governance-state drift between iteration topology files (plan) and
 * the forge (GitHub Issue state / PR merge events). Zero LLM calls. Stateless
 * — every run is a fresh read; no persistent store.
 *
 * Per D-067. Sibling to verify-docs.ts.
 *
 * Usage:
 *   bun scripts/verify-coherence.ts                   # JSON + human output
 *   bun scripts/verify-coherence.ts --json            # JSON only
 *   bun scripts/verify-coherence.ts --human           # human-readable only
 *   bun scripts/verify-coherence.ts --closes-n        # Closes #N gate (CI — reads BRANCH + PR_BODY env)
 *   GITHUB_TOKEN='' bun scripts/verify-coherence.ts   # test no-token path
 */

import { graphql } from '@octokit/graphql'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseIteration } from '@atta/aeg-core'
import type { ForgeFacts, Iteration, Task } from '@atta/aeg-core'
import { fetchForgeFacts } from '../apps/aeg/web/studio/src/lib/forge/fetch-forge-facts'
import { resolveGithubToken } from '../apps/aeg/web/studio/src/lib/forge/github-token'
import { resolveRepo } from '../apps/aeg/web/studio/src/lib/forge/resolve-repo'
import { DOC_OWNERS_PATH, checkDecisionNumbers, checkManifestValidity } from './verify-docs'

// ---------- types -------------------------------------------------------------

export type CheckFailure = {
  issue?: number | null
  iteration: string
  task?: string
  reason: string
}

export type CheckResult = {
  check: string
  status: 'pass' | 'fail' | 'info'
  failures: CheckFailure[]
  note?: string
}

export type TaskEntry = {
  iterationSlug: string
  archived: boolean
  task: Task
  /** `undefined` when the forge was unavailable or the issue didn't exist. */
  facts: ForgeFacts | undefined
}

export type IterationFile = {
  slug: string
  archived: boolean
  iteration: Iteration
}

// ---------- pure check evaluators --------------------------------------------

/**
 * A1: Every closed task-Issue has a merged closing PR.
 * Fail class: `closed-without-merge`
 */
export function checkA1(entries: TaskEntry[]): CheckResult {
  const failures: CheckFailure[] = []
  for (const e of entries) {
    if (!e.facts) continue
    if (e.facts.issueState === 'closed' && e.facts.prState !== 'merged') {
      failures.push({
        issue: e.task.issue,
        iteration: e.iterationSlug,
        task: e.task.id,
        reason: `Issue closed but closing PR is not merged (prState: ${e.facts.prState})`
      })
    }
  }
  return { check: 'A1', status: failures.length > 0 ? 'fail' : 'pass', failures }
}

/**
 * A2: The closing PR of each closed task-Issue carries an Archivist provenance block.
 * Fail class: `archived-without-provenance`
 *
 * `hasProvenanceByKey`: Map keyed by `${iterSlug}/${taskId}` → true when the
 * closing PR has a comment containing `### AEG provenance`.
 */
export function checkA2(entries: TaskEntry[], hasProvenanceByKey: Map<string, boolean>): CheckResult {
  const failures: CheckFailure[] = []
  for (const e of entries) {
    if (!e.facts) continue
    // Only check tasks whose issue is closed AND whose closing PR merged.
    if (e.facts.issueState !== 'closed' || e.facts.prState !== 'merged') continue
    const key = `${e.iterationSlug}/${e.task.id}`
    const hasProvenance = hasProvenanceByKey.get(key)
    // If key is absent from the map we were unable to fetch (forge error); skip.
    if (hasProvenance === undefined) continue
    if (!hasProvenance) {
      failures.push({
        issue: e.task.issue,
        iteration: e.iterationSlug,
        task: e.task.id,
        reason: 'Closing PR has no `### AEG provenance` comment (Archivist close-out missing)'
      })
    }
  }
  return { check: 'A2', status: failures.length > 0 ? 'fail' : 'pass', failures }
}

/**
 * A3: Every Issue whose closing PR merged is itself closed.
 * Fail class: `auto-close-misfire` — the headline check (#174 class).
 */
export function checkA3(entries: TaskEntry[]): CheckResult {
  const failures: CheckFailure[] = []
  for (const e of entries) {
    if (!e.facts) continue
    if (e.facts.prState === 'merged' && e.facts.issueState !== 'closed') {
      failures.push({
        issue: e.task.issue,
        iteration: e.iterationSlug,
        task: e.task.id,
        reason: 'Closing PR is merged but Issue is still open (GitHub auto-close misfire)'
      })
    }
  }
  return { check: 'A3', status: failures.length > 0 ? 'fail' : 'pass', failures }
}

/**
 * T1: Every topology row's Issue ref resolves to a real Issue.
 * Fail class: `phantom-issue-ref`
 *
 * A task has a non-null issue number in the topology but is absent from the
 * forge facts map → the issue doesn't exist on GitHub.
 */
export function checkT1(entries: TaskEntry[]): CheckResult {
  const failures: CheckFailure[] = []
  for (const e of entries) {
    // Skip: issue was null in topology (TBD or empty); T3 handles that.
    if (e.task.issue === null) continue
    // facts === undefined and issue !== null → forge query returned nothing for this issue
    if (e.facts === undefined) {
      failures.push({
        issue: e.task.issue,
        iteration: e.iterationSlug,
        task: e.task.id,
        reason: `Issue #${e.task.issue} in topology does not resolve to a real GitHub Issue`
      })
    }
  }
  return { check: 'T1', status: failures.length > 0 ? 'fail' : 'pass', failures }
}

/**
 * T2: Every open Issue labeled `iteration:X` appears in X's topology file.
 * Fail class: `orphan-task`
 *
 * `openIssuesBySlug`: Map from active iteration slug → list of open issue
 * numbers fetched from the forge with that `iteration:` label.
 * `topologyIssuesBySlug`: Map from slug → Set of issue numbers in the topology.
 */
export function checkT2(
  openIssuesBySlug: Map<string, number[]>,
  topologyIssuesBySlug: Map<string, Set<number>>
): CheckResult {
  const failures: CheckFailure[] = []
  for (const [slug, openNums] of openIssuesBySlug) {
    const topologySet = topologyIssuesBySlug.get(slug) ?? new Set<number>()
    for (const num of openNums) {
      if (!topologySet.has(num)) {
        failures.push({
          issue: num,
          iteration: slug,
          reason: `Issue #${num} is open and labeled iteration:${slug} but does not appear in the topology file`
        })
      }
    }
  }
  return { check: 'T2', status: failures.length > 0 ? 'fail' : 'pass', failures }
}

/**
 * T3: No `#TBD` rows in an active iteration.
 * Fail class: `tbd-in-active-iteration`
 *
 * A task in an active iteration has a null issue ref (empty / `—` / `#TBD`).
 */
export function checkT3(entries: TaskEntry[]): CheckResult {
  const failures: CheckFailure[] = []
  for (const e of entries) {
    if (!e.archived && e.task.issue === null) {
      failures.push({
        issue: null,
        iteration: e.iterationSlug,
        task: e.task.id,
        reason: `Task ${e.task.id} in active iteration has no Issue ref (#TBD or empty) — D-055 requires all active tasks to have Issue numbers`
      })
    }
  }
  return { check: 'T3', status: failures.length > 0 ? 'fail' : 'pass', failures }
}

/**
 * D1: A task with an open PR has all `depends-on` Issues closed.
 * Fail class: `dispatched-on-unmet-deps`
 *
 * `issueToEntry`: Map from issue number → TaskEntry, for resolving `#NNN`
 * style depends-on refs in addition to task-ID style refs.
 * `taskToEntry`: Map from `${slug}/${taskId}` → TaskEntry for same-iteration refs.
 */
export function checkD1(
  entries: TaskEntry[],
  issueToEntry: Map<number, TaskEntry>,
  taskToEntry: Map<string, TaskEntry>
): CheckResult {
  const failures: CheckFailure[] = []
  for (const e of entries) {
    if (!e.facts) continue
    if (e.facts.prState !== 'open') continue

    for (const dep of e.task.dependsOn) {
      const depEntry = resolveDepEntry(dep, e.iterationSlug, issueToEntry, taskToEntry)
      if (!depEntry) continue // unknown dep — not a D1 concern

      const depFacts = depEntry.facts
      const depClosed = depFacts?.issueState === 'closed'
      if (!depClosed) {
        failures.push({
          issue: e.task.issue,
          iteration: e.iterationSlug,
          task: e.task.id,
          reason: `Task has open PR but depends-on ${dep} (issue #${depEntry.task.issue ?? '?'}) is not closed`
        })
      }
    }
  }
  return { check: 'D1', status: failures.length > 0 ? 'fail' : 'pass', failures }
}

function resolveDepEntry(
  dep: string,
  iterationSlug: string,
  issueToEntry: Map<number, TaskEntry>,
  taskToEntry: Map<string, TaskEntry>
): TaskEntry | undefined {
  // `#NNN` style — resolve by issue number
  const issueMatch = dep.match(/^#(\d+)$/)
  if (issueMatch?.[1]) return issueToEntry.get(Number(issueMatch[1]))
  // Task-ID style — resolve within same iteration first, then globally
  return taskToEntry.get(`${iterationSlug}/${dep}`) ?? taskToEntry.get(dep)
}

/**
 * L1: Active iteration with zero open task-Issues → should be archived.
 * Fail class: `stale-active-iteration`
 *
 * An active iteration (file not in completed/) where every task with a
 * known issue has `issueState === 'closed'`.
 */
export function checkL1(files: IterationFile[], entriesBySlug: Map<string, TaskEntry[]>): CheckResult {
  const failures: CheckFailure[] = []
  for (const f of files) {
    if (f.archived) continue
    const entries = entriesBySlug.get(f.slug) ?? []
    const withFacts = entries.filter((e) => e.facts !== undefined)
    if (withFacts.length === 0) continue // forge unavailable or no tasks with issues
    const allClosed = withFacts.every((e) => e.facts?.issueState === 'closed')
    if (allClosed) {
      failures.push({
        iteration: f.slug,
        reason: 'Active iteration has no open task-Issues — consider archiving to completed/'
      })
    }
  }
  return { check: 'L1', status: failures.length > 0 ? 'fail' : 'pass', failures }
}

/**
 * L2: Completed/ iteration with any open task-Issue → premature archive.
 * Fail class: `premature-archive`
 */
export function checkL2(files: IterationFile[], entriesBySlug: Map<string, TaskEntry[]>): CheckResult {
  const failures: CheckFailure[] = []
  for (const f of files) {
    if (!f.archived) continue
    const entries = entriesBySlug.get(f.slug) ?? []
    for (const e of entries) {
      if (!e.facts) continue
      if (e.facts.issueState === 'open') {
        failures.push({
          issue: e.task.issue,
          iteration: f.slug,
          task: e.task.id,
          reason: `Archived iteration has open task-Issue #${e.task.issue ?? '?'} (premature archive)`
        })
      }
    }
  }
  return { check: 'L2', status: failures.length > 0 ? 'fail' : 'pass', failures }
}

/**
 * L3: Count of active iterations — informational only, does not affect exit code.
 */
export function checkL3(files: IterationFile[]): CheckResult {
  const active = files.filter((f) => !f.archived)
  return {
    check: 'L3',
    status: 'info',
    failures: [],
    note: `${active.length} active iteration(s): ${active.map((f) => f.slug).join(', ') || '(none)'}`
  }
}

/**
 * N1/N2/M1/M2/M3: Decision-number integrity + manifest validity.
 * Implemented by T2 (#217) per D-067; delegates to verify-docs.ts helpers.
 *
 * N1 (hard-fail): duplicate D-NNN within a log.
 * N2 (info/advisory): skipped D-NNN within a log (cross-log gaps expected — §6).
 * M1 (hard-fail): dangling in-repo pointer in doc-owners.
 * M2 (info/advisory): malformed glob syntax (extremely rare with our simple grammar).
 * M3 (hard-fail): duplicate glob in doc-owners.
 */
export function checkN1N2M1M2M3(): CheckResult[] {
  const results: CheckResult[] = []

  // Find all decision log files
  const logFiles: string[] = []
  const globalLog = join(REPO_ROOT, 'aeg-project/decisions.md')
  if (existsSync(globalLog)) logFiles.push('aeg-project/decisions.md')
  const appsDir = join(REPO_ROOT, 'apps')
  if (existsSync(appsDir)) {
    for (const app of readdirSync(appsDir)) {
      const specsDir = join(appsDir, app, 'specs')
      if (!existsSync(specsDir)) continue
      for (const file of readdirSync(specsDir)) {
        if (file.endsWith('-decisions.md')) {
          logFiles.push(join('apps', app, 'specs', file))
        }
      }
    }
  }

  // N1 / N2 — decision-number integrity
  const allN1Failures: CheckFailure[] = []
  const allN2Notes: string[] = []
  for (const p of logFiles) {
    const abs = join(REPO_ROOT, p)
    if (!existsSync(abs)) continue
    const { n1Errors, n2Notes } = checkDecisionNumbers(readFileSync(abs, 'utf8'), p)
    for (const reason of n1Errors) allN1Failures.push({ iteration: 'decisions', reason })
    allN2Notes.push(...n2Notes)
  }

  results.push({
    check: 'N1',
    status: allN1Failures.length > 0 ? 'fail' : 'pass',
    failures: allN1Failures
  })
  results.push({
    check: 'N2',
    status: 'info',
    failures: [],
    note: allN2Notes.length > 0 ? allN2Notes.join(' | ') : 'No skipped decision numbers detected within any log.'
  })

  // M1 / M2 / M3 — manifest validity
  const docOwnersAbs = join(REPO_ROOT, DOC_OWNERS_PATH)
  const docOwnersContent = existsSync(docOwnersAbs) ? readFileSync(docOwnersAbs, 'utf8') : null

  const { m1Errors, m2Notes, m3Errors } = checkManifestValidity(docOwnersContent)

  results.push({
    check: 'M1',
    status: m1Errors.length > 0 ? 'fail' : 'pass',
    failures: m1Errors.map((reason) => ({ iteration: 'doc-owners', reason }))
  })
  results.push({
    check: 'M2',
    status: 'info',
    failures: [],
    note: m2Notes.length > 0 ? m2Notes.join(' | ') : 'All globs syntactically valid.'
  })
  results.push({
    check: 'M3',
    status: m3Errors.length > 0 ? 'fail' : 'pass',
    failures: m3Errors.map((reason) => ({ iteration: 'doc-owners', reason }))
  })

  return results
}

/**
 * Closes #N gate — Layer 1 of D-069's forge-lifecycle enforcement.
 *
 * A task PR (branch `task/<iter>/<n>`) must carry `Closes #<its-issue>` in
 * the body. Non-task branches are silently bypassed (returns ok:true).
 *
 * Pure function; reads from injected parameters. The CLI entry-point wires
 * in BRANCH + PR_BODY env vars.
 */
export function checkClosesN(
  branch: string,
  prBody: string,
  iterationFiles: IterationFile[]
): { ok: boolean; message?: string; expectedIssue?: number } {
  const m = branch.match(/^task\/([^/]+)\/([^/]+)$/)
  if (!m) return { ok: true } // non-task branch — bypass

  const iterSlug = m[1] as string
  const taskId = m[2] as string

  const iterFile = iterationFiles.find((f) => f.slug === iterSlug)
  if (!iterFile) {
    return {
      ok: false,
      message: `closes-n: branch "${branch}" references iteration "${iterSlug}" but no topology file found at aeg-root/iterations/${iterSlug}.md. Ensure the iteration file exists before opening the PR.`
    }
  }

  const task = iterFile.iteration.tasks.find((t) => t.id === taskId)
  if (!task) {
    return {
      ok: false,
      message: `closes-n: branch "${branch}" references task "${taskId}" not found in ${iterSlug} topology. Verify the task ID matches the iteration file.`
    }
  }

  if (task.issue === null) {
    return {
      ok: false,
      message: `closes-n: task "${taskId}" in "${iterSlug}" has no Issue number (#TBD). The Planner must cut the Issue before this PR can be validated.`
    }
  }

  const expectedIssue = task.issue
  const closesPattern = /(?:closes|close|fixes|fix|resolves|resolve)\s*:?\s*#(\d+)/gi
  const referenced = new Set<number>()
  for (const hit of prBody.matchAll(closesPattern)) {
    referenced.add(Number(hit[1]))
  }

  if (!referenced.has(expectedIssue)) {
    return {
      ok: false,
      expectedIssue,
      message: `closes-n: PR body does not contain \`Closes #${expectedIssue}\` (required for task "${taskId}" in iteration "${iterSlug}"). Add it to the PR body Summary section.`
    }
  }

  return { ok: true, expectedIssue }
}

// ---------- forge I/O helpers -------------------------------------------------

const PROVENANCE_PATTERN = /^###\s+AEG provenance\b/im

type CloserNode = {
  number: number
  body: string
  comments: { nodes: Array<{ body: string }> }
} | null

type ProvenanceResponse = {
  repository: Record<string, { timelineItems: { nodes: Array<{ closer: CloserNode }> } } | null> | null
}

/**
 * Batch-fetch closing-PR bodies + comments for `issueNums` and return a map
 * of issue number → `true` when `### AEG provenance` is found in the PR body
 * or any of its first 50 comments.
 *
 * Returns an empty Map (all skipped) when no token is available.
 */
export async function fetchProvenance(
  issueNums: number[],
  owner: string,
  repo: string,
  token: string
): Promise<Map<number, boolean>> {
  const result = new Map<number, boolean>()
  if (issueNums.length === 0) return result

  const client = graphql.defaults({ headers: { authorization: `bearer ${token}` } })

  const perIssue = issueNums
    .map(
      (n) => `
    i_${n}: issue(number: ${n}) {
      timelineItems(first: 1, itemTypes: [CLOSED_EVENT]) {
        nodes {
          ... on ClosedEvent {
            closer {
              ... on PullRequest {
                number
                body
                comments(first: 50) {
                  nodes { body }
                }
              }
            }
          }
        }
      }
    }`
    )
    .join('')

  const query = `query Provenance($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {${perIssue}
  }
}`

  let response: ProvenanceResponse
  try {
    response = await client<ProvenanceResponse>(query, { owner, repo })
  } catch {
    return result // network / auth error — A2 will skip entries with no key
  }

  if (!response.repository) return result

  for (const n of issueNums) {
    const raw = response.repository[`i_${n}`]
    if (!raw) {
      result.set(n, false)
      continue
    }
    const closer = raw.timelineItems?.nodes?.[0]?.closer
    if (!closer) {
      result.set(n, false)
      continue
    }
    const bodyHas = PROVENANCE_PATTERN.test(closer.body ?? '')
    const commentHas = closer.comments.nodes.some((c) => PROVENANCE_PATTERN.test(c.body))
    result.set(n, bodyHas || commentHas)
  }

  return result
}

type LabeledIssuesResponse = {
  repository: Record<string, { nodes: Array<{ number: number }> } | null> | null
}

/**
 * Fetch open issue numbers for each active iteration slug in one batched query.
 * Returns a Map from slug → number[].
 */
export async function fetchOpenIssuesByLabel(
  slugs: string[],
  owner: string,
  repo: string,
  token: string
): Promise<Map<string, number[]>> {
  const result = new Map<string, number[]>()
  if (slugs.length === 0) return result

  const client = graphql.defaults({ headers: { authorization: `bearer ${token}` } })

  // GraphQL alias: replace hyphens with underscores (hyphens are invalid in aliases)
  const toAlias = (slug: string) => `iter_${slug.replace(/-/g, '_')}`

  const perSlug = slugs
    .map(
      (slug) => `
    ${toAlias(slug)}: issues(states: [OPEN], labels: [${JSON.stringify(`iteration:${slug}`)}], first: 100) {
      nodes { number }
    }`
    )
    .join('')

  const query = `query LabeledIssues($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {${perSlug}
  }
}`

  let response: LabeledIssuesResponse
  try {
    response = await client<LabeledIssuesResponse>(query, { owner, repo })
  } catch {
    return result
  }

  if (!response.repository) return result

  for (const slug of slugs) {
    const conn = response.repository[toAlias(slug)]
    result.set(slug, conn?.nodes?.map((n) => n.number) ?? [])
  }

  return result
}

// ---------- iteration file loader --------------------------------------------

const REPO_ROOT = join(import.meta.dir, '..')
const AEG_ROOT = join(REPO_ROOT, 'aeg-root')
const ITERATIONS_DIR = join(AEG_ROOT, 'iterations')
const COMPLETED_DIR = join(ITERATIONS_DIR, 'completed')

function isIterationFile(name: string): boolean {
  return name.endsWith('.md') && name !== 'README.md' && !name.endsWith('.tokens.md')
}

export function loadIterationFiles(): IterationFile[] {
  const files: IterationFile[] = []

  if (existsSync(ITERATIONS_DIR)) {
    for (const name of readdirSync(ITERATIONS_DIR)) {
      if (!isIterationFile(name)) continue
      const raw = readFileSync(join(ITERATIONS_DIR, name), 'utf8')
      files.push({ slug: name.replace(/\.md$/, ''), archived: false, iteration: parseIteration(raw) })
    }
  }

  if (existsSync(COMPLETED_DIR)) {
    for (const name of readdirSync(COMPLETED_DIR)) {
      if (!isIterationFile(name)) continue
      const raw = readFileSync(join(COMPLETED_DIR, name), 'utf8')
      files.push({ slug: name.replace(/\.md$/, ''), archived: true, iteration: parseIteration(raw) })
    }
  }

  return files
}

// ---------- main orchestrator ------------------------------------------------

export async function runCoherenceChecks(): Promise<{ results: CheckResult[]; forgeUnavailable: boolean }> {
  const files = loadIterationFiles()
  const results: CheckResult[] = []

  // ---------- pure local checks (no forge) ----------

  const allEntries: TaskEntry[] = files.flatMap((f) =>
    f.iteration.tasks.map((t) => ({ iterationSlug: f.slug, archived: f.archived, task: t, facts: undefined }))
  )

  results.push(checkT3(allEntries))
  results.push(checkL3(files))

  // ---------- forge-dependent checks ----------

  const repo = await resolveRepo()
  const token = await resolveGithubToken()

  if (!token) {
    results.push({
      check: 'FORGE',
      status: 'fail',
      failures: [],
      note: 'severity:infra — No GitHub token found (set GITHUB_TOKEN or run `gh auth login`). All forge-dependent checks skipped.'
    })
    results.push(...checkN1N2M1M2M3())
    return { results, forgeUnavailable: true }
  }

  if (!repo) {
    results.push({
      check: 'FORGE',
      status: 'fail',
      failures: [],
      note: 'severity:infra — Could not resolve GitHub repository (set AEG_REPO=owner/repo). All forge-dependent checks skipped.'
    })
    results.push(...checkN1N2M1M2M3())
    return { results, forgeUnavailable: true }
  }

  const { owner, repo: repoName } = repo

  // Fetch forge facts for all iterations (A1/A2/A3 share this fetch — D-067)
  const snapshotsBySlug = new Map<string, Map<string, ForgeFacts>>()
  let anyForgeUnavailable = false

  for (const f of files) {
    const tasks = f.iteration.tasks.filter((t) => t.issue !== null).map((t) => ({ id: t.id, issue: t.issue as number }))

    if (tasks.length === 0) continue

    const snapshot = await fetchForgeFacts({
      owner,
      repo: repoName,
      iteration: f.slug,
      tasks
    })

    if (snapshot.unavailable) {
      anyForgeUnavailable = true
    } else {
      snapshotsBySlug.set(f.slug, snapshot.facts)
    }
  }

  // Build enriched entries with forge facts
  const enrichedEntries: TaskEntry[] = files.flatMap((f) => {
    const factsMap = snapshotsBySlug.get(f.slug)
    return f.iteration.tasks.map((t) => ({
      iterationSlug: f.slug,
      archived: f.archived,
      task: t,
      // undefined when forge unavailable for this iteration OR when issue doesn't exist
      facts: factsMap?.get(t.id)
    }))
  })

  // Build lookup maps
  const issueToEntry = new Map<number, TaskEntry>()
  const taskToEntry = new Map<string, TaskEntry>()
  for (const e of enrichedEntries) {
    if (e.task.issue !== null) issueToEntry.set(e.task.issue, e)
    taskToEntry.set(`${e.iterationSlug}/${e.task.id}`, e)
  }

  // Only run forge checks for entries whose iteration snapshot was available
  const availableEntries = enrichedEntries.filter((e) => snapshotsBySlug.has(e.iterationSlug))

  // A1 / A3 checks
  results.push(checkA1(availableEntries))
  results.push(checkA3(availableEntries))

  // A2 — needs closing PR numbers + comment check (separate batch query)
  const a2Candidates = availableEntries.filter(
    (e) => e.facts?.issueState === 'closed' && e.facts.prState === 'merged' && e.task.issue !== null
  )
  const a2IssueNums = a2Candidates.map((e) => e.task.issue as number)
  const provenanceByIssueNum = await fetchProvenance(a2IssueNums, owner, repoName, token)

  // Convert provenance lookup from issue# to `slug/taskId` key
  const provenanceByKey = new Map<string, boolean>()
  for (const e of a2Candidates) {
    if (e.task.issue === null) continue
    const hasProvenance = provenanceByIssueNum.get(e.task.issue)
    if (hasProvenance !== undefined) {
      provenanceByKey.set(`${e.iterationSlug}/${e.task.id}`, hasProvenance)
    }
  }
  results.push(checkA2(availableEntries, provenanceByKey))

  // T1 check (only when forge available)
  results.push(checkT1(availableEntries))

  // T2 check
  const activeSlugs = files.filter((f) => !f.archived).map((f) => f.slug)
  const openIssuesBySlug = await fetchOpenIssuesByLabel(activeSlugs, owner, repoName, token)

  const topologyIssuesBySlug = new Map<string, Set<number>>()
  for (const f of files) {
    if (f.archived) continue
    const nums = new Set<number>()
    for (const t of f.iteration.tasks) {
      if (t.issue !== null) nums.add(t.issue)
    }
    topologyIssuesBySlug.set(f.slug, nums)
  }
  results.push(checkT2(openIssuesBySlug, topologyIssuesBySlug))

  // D1 check
  results.push(checkD1(availableEntries, issueToEntry, taskToEntry))

  // L1 / L2 checks
  const entriesBySlug = new Map<string, TaskEntry[]>()
  for (const e of availableEntries) {
    const list = entriesBySlug.get(e.iterationSlug) ?? []
    list.push(e)
    entriesBySlug.set(e.iterationSlug, list)
  }
  results.push(checkL1(files, entriesBySlug))
  results.push(checkL2(files, entriesBySlug))

  // N/M stubs
  results.push(...checkN1N2M1M2M3())

  return { results, forgeUnavailable: anyForgeUnavailable }
}

// ---------- output ------------------------------------------------------------

function printHuman(results: CheckResult[], forgeUnavailable: boolean): void {
  if (forgeUnavailable) {
    console.warn('\n⚠  Some iterations had forge data unavailable — forge-dependent checks may be incomplete.\n')
  }

  const failed = results.filter((r) => r.status === 'fail')
  const passed = results.filter((r) => r.status === 'pass')
  const info = results.filter((r) => r.status === 'info')

  console.log(`verify-coherence: ${passed.length} passed, ${failed.length} failed, ${info.length} info\n`)

  for (const r of info) {
    console.log(`  [info] ${r.check}: ${r.note ?? ''}`)
  }

  if (failed.length === 0) {
    console.log('All checks passed.')
    return
  }

  console.error(`\nFAILED CHECKS (${failed.length}):\n`)
  for (const r of failed) {
    if (r.note) {
      console.error(`  ✗ ${r.check}: ${r.note}`)
      continue
    }
    console.error(`  ✗ ${r.check} (${r.failures.length} failure(s)):`)
    for (const f of r.failures) {
      const issueStr = f.issue != null ? ` #${f.issue}` : ''
      const taskStr = f.task ? ` [task ${f.task}]` : ''
      console.error(`      ${f.iteration}${issueStr}${taskStr}: ${f.reason}`)
    }
  }
}

// ---------- CLI entry point --------------------------------------------------

if (import.meta.main) {
  const args = process.argv.slice(2)

  // --closes-n: Closes #N gate for task branches (CI Layer 1 — D-069).
  // Reads BRANCH and PR_BODY from env. Exits 0 on pass/bypass, 1 on fail.
  if (args.includes('--closes-n')) {
    const branch = process.env.BRANCH ?? ''
    const prBody = process.env.PR_BODY ?? ''
    if (!branch) {
      console.warn('closes-n: BRANCH env var not set — skipping (non-task context).')
      process.exit(0)
    }
    const files = loadIterationFiles()
    const result = checkClosesN(branch, prBody, files)
    if (result.ok) {
      const issueStr = result.expectedIssue ? ` (Closes #${result.expectedIssue} ✓)` : ''
      console.log(`closes-n: branch "${branch}" passes${issueStr}.`)
      process.exit(0)
    }
    console.error(`closes-n FAILED: ${result.message}`)
    process.exit(1)
  }

  const jsonOnly = args.includes('--json')
  const humanOnly = args.includes('--human')

  const { results, forgeUnavailable } = await runCoherenceChecks()

  const failed = results.filter((r) => r.status === 'fail')
  const passed = results.filter((r) => r.status === 'pass')
  const info = results.filter((r) => r.status === 'info')

  const report = {
    summary: { passed: passed.length, failed: failed.length, info: info.length },
    forgeUnavailable,
    checks: results
  }

  if (!humanOnly) {
    console.log(JSON.stringify(report, null, 2))
  }

  if (!jsonOnly) {
    if (!humanOnly) console.log('') // separator
    printHuman(results, forgeUnavailable)
  }

  process.exit(failed.length > 0 ? 1 : 0)
}
