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
 * This is a thin I/O shim — forge fetches, filesystem reads, and CLI arg/
 * format/exit handling only. The pure check evaluators (A1/A2/A3, T1/T2/T3,
 * D1, L1/L2/L3, checkClosesN) live in `../src/coherence-checks.ts`.
 *
 * Usage:
 *   bun packages/aeg-core/bin/verify-coherence.ts                   # JSON + human output
 *   bun packages/aeg-core/bin/verify-coherence.ts --json            # JSON only
 *   bun packages/aeg-core/bin/verify-coherence.ts --human           # human-readable only
 *   bun packages/aeg-core/bin/verify-coherence.ts --closes-n        # Closes #N gate (CI — reads BRANCH + PR_BODY env)
 *   GITHUB_TOKEN='' bun packages/aeg-core/bin/verify-coherence.ts   # test no-token path
 *
 * CWD-independent by design: chdir's to the repo root immediately below, since
 * this script is also spawned as a subprocess (apps/aeg/web/studio's
 * /api/coherence route) without an explicit cwd — every relative path in this
 * file (DOC_OWNERS_PATH, aeg-root/, etc.) must resolve correctly regardless of
 * the invoking process's own working directory.
 */

import { graphql } from '@octokit/graphql'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  checkA1,
  checkA2,
  checkA3,
  checkClosesN,
  checkD1,
  checkDecisionNumbers,
  checkL1,
  checkL2,
  checkL3,
  checkManifestValidity,
  checkR1,
  checkT1,
  checkT2,
  checkT3,
  DOC_OWNERS_PATH,
  parseIteration,
  R1_GRANDFATHERED_ISSUES
} from '../src/index'
import type { CheckResult, ForgeFacts, ForgeIssue, IterationFile, TaskEntry } from '../src/index'
import { fetchForgeFacts } from '../../../apps/aeg/web/studio/src/lib/forge/fetch-forge-facts'
import { resolveGithubToken } from '../../../apps/aeg/web/studio/src/lib/forge/github-token'
import { resolveRepo } from '../../../apps/aeg/web/studio/src/lib/forge/resolve-repo'

const REPO_ROOT = join(import.meta.dir, '../../..')
process.chdir(REPO_ROOT)

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
function checkN1N2M1M2M3(): CheckResult[] {
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
  const allN1Failures: CheckResult['failures'] = []
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

  const { m1Errors, m2Notes, m3Errors } = checkManifestValidity(docOwnersContent, existsSync)

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
  repository: Record<
    string,
    { nodes: Array<{ number: number; body: string; labels: { nodes: Array<{ name: string }> } }> } | null
  > | null
}

/**
 * Fetch open issues (number + body + labels) for each active iteration slug
 * in one batched query. Returns a Map from slug → ForgeIssue[].
 *
 * Extended for R1 (D-078 rationale-completeness gate — aeg-governance-hardening
 * task 1) to carry `body`/`labels` alongside `number`; T2 (orphan-task) only
 * needs the number, R1 needs the body to run `checkIssueRationale` against.
 * One batched query, no per-issue round-trips, for both checks.
 */
export async function fetchOpenIssuesByLabel(
  slugs: string[],
  owner: string,
  repo: string,
  token: string
): Promise<Map<string, ForgeIssue[]>> {
  const result = new Map<string, ForgeIssue[]>()
  if (slugs.length === 0) return result

  const client = graphql.defaults({ headers: { authorization: `bearer ${token}` } })

  // GraphQL alias: replace hyphens with underscores (hyphens are invalid in aliases)
  const toAlias = (slug: string) => `iter_${slug.replace(/-/g, '_')}`

  const perSlug = slugs
    .map(
      (slug) => `
    ${toAlias(slug)}: issues(states: [OPEN], labels: [${JSON.stringify(`iteration:${slug}`)}], first: 100) {
      nodes { number body labels(first: 20) { nodes { name } } }
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
    const issues: ForgeIssue[] =
      conn?.nodes?.map((n) => ({
        number: n.number,
        body: n.body ?? '',
        labels: n.labels?.nodes?.map((l) => l.name) ?? []
      })) ?? []
    result.set(slug, issues)
  }

  return result
}

// ---------- iteration file loader --------------------------------------------

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

  // ---------- CI scope detection ----------
  // Parse the PR's iteration from BRANCH (CI) or GITHUB_HEAD_REF (Actions env).
  // Used to scope T3 so a PR against aeg-coherence-v1 isn't blocked by legacy
  // #TBD rows in vada-production-v1 or herald iterations.
  const ciIterationSlug: string | null = (() => {
    const branch = process.env.BRANCH ?? process.env.GITHUB_HEAD_REF ?? ''
    const m = branch.match(/^task\/([^/]+)\//)
    return m?.[1] ?? null
  })()

  // ---------- base entries (no forge facts yet) ----------

  const allEntries: TaskEntry[] = files.flatMap((f) =>
    f.iteration.tasks.map((t) => ({ iterationSlug: f.slug, archived: f.archived, task: t, facts: undefined }))
  )

  results.push(checkL3(files))

  // ---------- forge-dependent checks ----------

  const repo = await resolveRepo()
  const token = await resolveGithubToken()

  if (!token) {
    // No forge fetch was attempted at all — every iteration is unavailable.
    const allUnavailableSlugs = new Set(files.map((f) => f.slug))
    results.push(checkT3(allEntries, ciIterationSlug, undefined, allUnavailableSlugs))
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
    // No forge fetch was attempted at all — every iteration is unavailable.
    const allUnavailableSlugs = new Set(files.map((f) => f.slug))
    results.push(checkT3(allEntries, ciIterationSlug, undefined, allUnavailableSlugs))
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

  // Iterations whose forge snapshot fetch failed entirely — used by T3's
  // forge-unavailable carve-out so a #TBD row isn't silently un-grandfathered
  // just because its iteration's forge data never arrived.
  const forgeUnavailableSlugs = new Set(files.map((f) => f.slug).filter((slug) => !snapshotsBySlug.has(slug)))

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

  // T3 — post-forge so enrichedEntries can be used for pre-cutoff date proxy
  results.push(checkT3(allEntries, ciIterationSlug, enrichedEntries, forgeUnavailableSlugs))

  // T2 / R1 checks — share one batched label-scoped Issue fetch (number + body + labels).
  // The fetch itself stays repo-wide (all active slugs) so --json/audit mode
  // keeps full coverage; only checkT2's own failure computation is scoped by
  // ciIterationSlug, mirroring T3.
  const activeSlugs = files.filter((f) => !f.archived).map((f) => f.slug)
  const issuesBySlug = await fetchOpenIssuesByLabel(activeSlugs, owner, repoName, token)

  const openIssueNumsBySlug = new Map<string, number[]>(
    [...issuesBySlug].map(([slug, issues]) => [slug, issues.map((i) => i.number)])
  )

  const topologyIssuesBySlug = new Map<string, Set<number>>()
  for (const f of files) {
    if (f.archived) continue
    const nums = new Set<number>()
    for (const t of f.iteration.tasks) {
      if (t.issue !== null) nums.add(t.issue)
    }
    topologyIssuesBySlug.set(f.slug, nums)
  }
  results.push(checkT2(openIssueNumsBySlug, topologyIssuesBySlug, ciIterationSlug))
  results.push(checkR1(issuesBySlug, R1_GRANDFATHERED_ISSUES))

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
