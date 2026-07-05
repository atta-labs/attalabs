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

import { execSync } from 'node:child_process'
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
  R1_GRANDFATHERED_ISSUES,
  scopeT2ToPlanPr,
  touchesAnyTopology
} from '../src/index'
import type { CheckResult, ForgeFacts, IterationFile, TaskEntry } from '../src/index'
import { fetchForgeFacts } from '../../../apps/aeg/web/studio/src/lib/forge/fetch-forge-facts'
import { fetchOpenIssuesByLabel } from '../../../apps/aeg/web/studio/src/lib/forge/fetch-open-issues'
import { fetchProvenance } from '../../../apps/aeg/web/studio/src/lib/forge/fetch-provenance'
import { resolveGithubToken } from '../../../apps/aeg/web/studio/src/lib/forge/github-token'
import { resolveRepo } from '../../../apps/aeg/web/studio/src/lib/forge/resolve-repo'

const REPO_ROOT = join(import.meta.dirname, '../../..')
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
// `fetchProvenance` and `fetchOpenIssuesByLabel` moved to Studio's forge lib
// (task 28, #372 bundled finding) so Studio's server components can share the
// single implementation without this CLI's top-level `process.chdir` side
// effect. Re-exported here so existing importers (verify-coherence.test.ts)
// keep working unchanged.
export { fetchProvenance }

// ---------- iteration file loader --------------------------------------------

const ITERATIONS_RELDIR = 'aeg-root/iterations'
const COMPLETED_RELDIR = 'aeg-root/iterations/completed'

function isIterationFile(name: string): boolean {
  return name.endsWith('.md') && name !== 'README.md' && !name.endsWith('.tokens.md')
}

/**
 * PR context for item 5 (aeg-governance-hardening task 24, #364, Part 2;
 * D-082): when set, iteration files THIS PR's own diff touches are read
 * from the PR's head ref (its own proposed content, e.g. a plan PR adding a
 * topology row); every other iteration file — the "repo state" side of
 * every coherence comparison — is read from a freshly-fetched
 * `origin/main`, never from the local checkout's `refs/pull/N/merge`, which
 * GitHub materializes lazily and can lag behind main (confirmed 5+ false-red
 * CI cycles, 2026-07-03/04). `null` (local dev, `--json` audit mode,
 * daily-drift): every file reads from `origin/main`.
 */
export type PrReadContext = { prHeadSha: string; touchedFiles: Set<string> } | null

function gitFetchMainQuiet(): void {
  try {
    // stdio: 'ignore' — this process's own stdout is the JSON report (in
    // --json mode); nothing this shells out to may write to it. `execSync`
    // without an explicit `stdio` already pipes the child's streams into
    // Node/Bun-internal buffers rather than the parent's real fds (verified:
    // this alone doesn't leak), but 'ignore' makes the "never touches our
    // stdout" invariant explicit rather than incidental.
    execSync('git fetch origin main --quiet', { stdio: 'ignore' })
  } catch {
    // best-effort — a fetch failure leaves origin/main at whatever the local
    // checkout already has; downstream reads simply fall back to that state.
  }
}

function listDirAtRef(ref: string, relDir: string): string[] {
  try {
    return execSync(`git ls-tree --name-only ${ref}:${relDir}`, { encoding: 'utf8' })
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function readFileAtRef(ref: string, relPath: string): string | null {
  try {
    return execSync(`git show ${ref}:${relPath}`, { encoding: 'utf8' })
  } catch {
    return null
  }
}

export function loadIterationFiles(prContext: PrReadContext = null): IterationFile[] {
  gitFetchMainQuiet()
  const files: IterationFile[] = []

  const loadDir = (relDir: string, archived: boolean): void => {
    const mainNames = new Set(listDirAtRef('origin/main', relDir))
    const prNames = prContext ? new Set(listDirAtRef(prContext.prHeadSha, relDir)) : new Set<string>()

    for (const name of new Set([...mainNames, ...prNames])) {
      if (!isIterationFile(name)) continue
      const relPath = `${relDir}/${name}`
      const readFromHead = prContext !== null && prContext.touchedFiles.has(relPath)
      const raw = readFromHead ? readFileAtRef(prContext!.prHeadSha, relPath) : readFileAtRef('origin/main', relPath)
      if (raw === null) continue
      files.push({ slug: name.replace(/\.md$/, ''), archived, iteration: parseIteration(raw) })
    }
  }

  loadDir(ITERATIONS_RELDIR, false)
  loadDir(COMPLETED_RELDIR, true)

  return files
}

// ---------- main orchestrator ------------------------------------------------

export type RunCoherenceChecksOptions = {
  /** See `PrReadContext` — repo-state reads move to fetched origin/main; the PR's own topology diff still reads from its head ref. */
  prContext?: PrReadContext
  /**
   * T2 relocation (D-082): `true` ONLY for a CI run against a plan PR whose
   * own diff touches an iteration topology file — the only PR kind that can
   * cause or cure a T2 gap. Defaults to `false` (info-only, never blocking)
   * for every other context: task-PR CI, local dev, `--json` audit mode,
   * daily-drift — matching the brief's "surfaced never blocking" rule.
   */
  isPlanPr?: boolean
}

export async function runCoherenceChecks(
  options: RunCoherenceChecksOptions = {}
): Promise<{ results: CheckResult[]; forgeUnavailable: boolean }> {
  const { prContext = null, isPlanPr = false } = options
  const files = loadIterationFiles(prContext)
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
  results.push(scopeT2ToPlanPr(checkT2(openIssueNumsBySlug, topologyIssuesBySlug, ciIterationSlug), isPlanPr))
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

  // PR context for item 5/T2-relocation (D-082) — set only by the
  // coherence-gate CI job (forge-lifecycle.yml). Absent everywhere else
  // (local dev, daily-drift, manual --json audit runs): every iteration
  // file reads from origin/main and T2 stays info-only (never blocking).
  const prHeadSha = process.env.PR_HEAD_SHA || null
  const touchedFilesRaw = process.env.PR_TOUCHED_FILES ?? ''
  const touchedFiles = new Set(
    touchedFilesRaw
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean)
  )
  const prContext = prHeadSha ? { prHeadSha, touchedFiles } : null
  const isPlanPr = touchesAnyTopology([...touchedFiles])

  const { results, forgeUnavailable } = await runCoherenceChecks({ prContext, isPlanPr })

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
