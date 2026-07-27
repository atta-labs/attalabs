#!/usr/bin/env bun

/**
 * verify-coherence — deterministic plan↔forge coherence oracle.
 *
 * Detects governance-state drift between iteration topology files (plan) and
 * the forge (GitHub Issue state / PR merge events). Zero LLM calls. Stateless
 * — every run is a fresh read; no persistent store.
 *
 *. Sibling to verify-docs.ts.
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
 * this script is also spawned as a subprocess (apps/vinaya/web's
 * /api/coherence route) without an explicit cwd — every relative path in this
 * file (DOC_OWNERS_PATH, aeg-root/, etc.) must resolve correctly regardless of
 * the invoking process's own working directory.
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  deriveIterationFromForge,
  fetchProvenance,
  fetchTaskIssueRefs,
  findMilestoneForSlug,
  listActiveIterationSlugs,
  listArchivedIterationSlugs,
  listIssueMilestonesForSlug,
  resolveGithubToken,
  resolveRepo
} from '@atta/aeg-forge-state'
import type { Iteration } from '@atta/aeg-types'
import {
  checkA1,
  checkA2,
  checkA3,
  checkClosesN,
  checkD1,
  checkL1,
  checkL2,
  checkL3,
  checkL4,
  checkL5,
  checkManifestValidity,
  checkR1,
  checkT1,
  checkT2,
  checkT3,
  DOC_OWNERS_PATH,
  extractClosesReferences,
  fetchForgeFacts,
  fetchOpenIssuesByLabel,
  parseIteration,
  R1_GRANDFATHERED_ISSUES,
  scopeT2ToPlanPr,
  touchesAnyTopology
} from '../src/index'
import type { CheckResult, ForgeFacts, IterationFile, TaskEntry } from '../src/index'

const REPO_ROOT = join(import.meta.dirname, '../../..')
process.chdir(REPO_ROOT)

/**
 * Implemented by T2; delegates to verify-docs.ts helpers.
 *
 * M1 (hard-fail): dangling in-repo pointer in doc-owners.
 * M2 (info/advisory): malformed glob syntax (extremely rare with our simple grammar).
 * M3 (hard-fail): duplicate glob in doc-owners.
 */
function checkM1M2M3(): CheckResult[] {
  const results: CheckResult[] = []

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
 *): when set, iteration files THIS PR's own diff touches are read
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

/**
 * Reads one non-PR-touched iteration file's content: `id`/`issue` come from
 * the forge (`@atta/aeg-forge-state`'s `deriveIterationFromForge`, task
 * aeg-forge-state-v1 3b, #437) when a repo resolves and the forge call
 * succeeds — the golden comparison (Issue #437) confirmed these two fields
 * match the file-parsed topology table exactly for every task that HAS a
 * forge Issue. `dependsOn`/`conflictsWith` are read from the topology table
 * itself (`parseIteration`) and merged in, NOT forge-derived — a deliberate,
 * TEMPORARY narrowing (Planner triage, Issue #437) of the original swap: at
 * least 9 grandfathered `vada-production-v1` Issues (#183 #184 #185 #186
 * #187 #188 #240 #241 #244) predate the "Dependency rationale" grammar
 * and carry no forge-parseable dependency data at all, and
 * `parse-rationale-deps.ts`'s cross-iteration-qualified-ref handling has its
 * own real gaps independent of that (fixed one instance on Issue #388, but
 * others may remain). Backfilling/auditing the rest is its own follow-up
 * task, not a blocker for this cutover.
 *
 * A `#TBD` topology row (no Issue cut yet, `issue: null`) has no forge
 * representation at all — `deriveIterationFromForge` can only ever list
 * tasks it finds via a labeled Issue, so a row with no Issue is structurally
 * invisible to it. T3 (`tbd-in-active-iteration`) exists specifically to
 * catch these — silently dropping them here would blind the one check whose
 * entire job is to see them (confirmed live: `vada-production-v1`'s 6a/6b/6c
 * rows, real `#TBD` entries, vanish from the forge-derived list entirely).
 * So any file task with no forge counterpart is appended as-is, fully
 * file-derived, not merged.
 *
 * Falls back to the file entirely (dependsOn/conflictsWith included, #TBD
 * rows included) when forge derivation itself fails — mirrors this file's
 * own "never let one signal's unavailability crash the whole oracle"
 * discipline, already applied to every forge-dependent check below. This is
 * the ONLY place either fallback/merge applies — the PR-head-SHA path
 * (the plan-PR scoping, below) always reads the PR's own uncommitted
 * diff via `readFileAtRef` + `parseIteration`, never the forge, since a plan
 * PR's own in-progress topology edit has no forge equivalent to derive from.
 */
async function deriveOrFallback(
  repo: { owner: string; repo: string } | null,
  slug: string,
  relPath: string
): Promise<Iteration | null> {
  const raw = readFileAtRef('origin/main', relPath)
  const fileIteration = raw === null ? null : parseIteration(raw)

  if (!repo) return fileIteration

  let forgeIteration: Iteration
  try {
    forgeIteration = await deriveIterationFromForge(repo.owner, repo.repo, slug)
  } catch (err) {
    console.warn(
      `[verify-coherence] forge derivation failed for iteration "${slug}" — falling back to file read: ${(err as Error).message}`
    )
    return fileIteration
  }

  if (fileIteration === null) return forgeIteration

  const forgeTaskIds = new Set(forgeIteration.tasks.map((t) => t.id))
  const fileTaskById = new Map(fileIteration.tasks.map((t) => [t.id, t]))

  const mergedTasks = forgeIteration.tasks.map((t) => {
    const fileTask = fileTaskById.get(t.id)
    // No file-side counterpart (shouldn't normally happen — forge/file ids
    // matched exactly for every real task in the golden comparison) —
    // keep forge's own dependsOn/conflictsWith rather than dropping them.
    if (!fileTask) return t
    return { ...t, dependsOn: fileTask.dependsOn, conflictsWith: fileTask.conflictsWith }
  })

  // File-only tasks (#TBD rows, no Issue to derive from) — appended as-is.
  const fileOnlyTasks = fileIteration.tasks.filter((t) => !forgeTaskIds.has(t.id))

  return { ...forgeIteration, tasks: [...mergedTasks, ...fileOnlyTasks] }
}

/**
 * `onlySlug`: skip every iteration but this one during the forge-derive
 * sweep below. The forge swap makes the general (unscoped) sweep meaningfully
 * slower than the old local-file read (one `gh` round trip per iteration per
 * lookup, sequential — ~1.5s/iteration observed across a real ~20-iteration
 * repo, vs near-instant `git show`), so a caller that only ever needs ONE
 * iteration's data (`--closes-n`, below) must opt out of paying for the rest.
 * `runCoherenceChecks` never passes this — its checks are genuinely
 * repo-wide and need every iteration.
 */
export async function loadIterationFiles(prContext: PrReadContext = null, onlySlug?: string): Promise<IterationFile[]> {
  gitFetchMainQuiet()
  const files: IterationFile[] = []
  const repo = await resolveRepo()

  const loadDir = async (relDir: string, archived: boolean): Promise<void> => {
    const mainNames = new Set(listDirAtRef('origin/main', relDir))
    const prNames = prContext ? new Set(listDirAtRef(prContext.prHeadSha, relDir)) : new Set<string>()

    for (const name of new Set([...mainNames, ...prNames])) {
      if (!isIterationFile(name)) continue
      const slug = name.replace(/\.md$/, '')
      if (onlySlug && slug !== onlySlug) continue
      const relPath = `${relDir}/${name}`
      const readFromHead = prContext?.touchedFiles.has(relPath) ?? false

      if (readFromHead) {
        const raw = readFileAtRef(prContext!.prHeadSha, relPath)
        if (raw === null) continue
        files.push({ slug, archived, iteration: parseIteration(raw) })
        continue
      }

      const iteration = await deriveOrFallback(repo, slug, relPath)
      if (iteration === null) continue
      files.push({ slug, archived, iteration })
    }
  }

  await loadDir(ITERATIONS_RELDIR, false)
  await loadDir(COMPLETED_RELDIR, true)

  // Forge-native iterations with no topology file at all (the forge-native cutover:
  // vinaya-studio-v1, vinaya-cli-v1, herald-hardening-v1 all had their
  // aeg-root/iterations/*.md deleted once their Milestone-derived replacement
  // was proven safe) are structurally invisible to the directory-listing
  // enumeration above — there is no filename for a slug with zero file to
  // ever appear in `mainNames`/`prNames`, so `deriveOrFallback` is never even
  // called for it, even though `deriveOrFallback` itself already handles a
  // missing file gracefully (readFileAtRef → null → pure-forge return, see
  // its own doc comment). Only attempted when the caller wants exactly one
  // slug (`onlySlug` — the closes-n gate's scoped-load path; the unscoped
  // repo-wide sweep never sets it and is unaffected) and that slug wasn't
  // already found via files. Gated on an explicit Milestone existence check
  // so an unrecognized branch slug (typo, deleted iteration with no
  // Milestone either) still reports "no topology found" rather than silently
  // synthesizing an iteration.
  if (onlySlug && repo && !files.some((f) => f.slug === onlySlug)) {
    const milestone = findMilestoneForSlug(repo.owner, repo.repo, onlySlug)
    if (milestone) {
      const iteration = await deriveOrFallback(repo, onlySlug, `${ITERATIONS_RELDIR}/${onlySlug}.md`)
      if (iteration !== null) files.push({ slug: onlySlug, archived: false, iteration })
    }
  }

  // Same forge-native gap, general (unscoped) sweep (#515):
  // once no iteration carries a topology file at all, the directory-listing
  // enumeration above finds nothing and every repo-wide check (A1-A3, T1-T3,
  // D1, L1-L4) would silently see zero iterations. Fill in every Milestone
  // (open or closed) the file sweep didn't already surface — same
  // `deriveOrFallback` used everywhere else in this loader, so a Milestone
  // whose slug DOES still have a legacy file gets its dependsOn/conflictsWith
  // merged in exactly as before.
  if (!onlySlug && repo) {
    const activeRefs = listActiveIterationSlugs(repo.owner, repo.repo)
    const archivedRefs = listArchivedIterationSlugs(repo.owner, repo.repo)
    for (const { slug, archived } of [
      ...activeRefs.map((r) => ({ slug: r.slug, archived: false })),
      ...archivedRefs.map((r) => ({ slug: r.slug, archived: true }))
    ]) {
      if (files.some((f) => f.slug === slug)) continue
      const relPath = `${archived ? COMPLETED_RELDIR : ITERATIONS_RELDIR}/${slug}.md`
      const iteration = await deriveOrFallback(repo, slug, relPath)
      if (iteration !== null) files.push({ slug, archived, iteration })
    }
  }

  return files
}

// ---------- main orchestrator ------------------------------------------------

export type RunCoherenceChecksOptions = {
  /** See `PrReadContext` — repo-state reads move to fetched origin/main; the PR's own topology diff still reads from its head ref. */
  prContext?: PrReadContext
  /**
   * T2 relocation: `true` ONLY for a CI run against a plan PR whose
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
  const files = await loadIterationFiles(prContext)
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
    results.push(...checkM1M2M3())
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
    results.push(...checkM1M2M3())
    return { results, forgeUnavailable: true }
  }

  const { owner, repo: repoName } = repo

  // Fetch forge facts for all iterations (A1/A2/A3 share this fetch)
  const snapshotsBySlug = new Map<string, Map<string, ForgeFacts>>()
  let anyForgeUnavailable = false

  const eligible = files
    .map((f) => ({
      f,
      tasks: f.iteration.tasks.filter((t) => t.issue !== null).map((t) => ({ id: t.id, issue: t.issue as number }))
    }))
    .filter(({ tasks }) => tasks.length > 0)

  const snapshotResults = await Promise.all(
    eligible.map(async ({ f, tasks }) => ({
      f,
      snapshot: await fetchForgeFacts({ owner, repo: repoName, iteration: f.slug, tasks })
    }))
  )

  for (const { f, snapshot } of snapshotResults) {
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

  // L4 — Issue-level Milestone-attachment drift (aeg-review-gate-v1 task 1
  // follow-up). Active = forge Milestone open, the same authority
  // `verify-dispatch.ts`'s Milestone-aware discovery uses — not `!f.archived`
  // (file location), so this never flags an iteration whose file predates
  // the Milestone birth rule but has no live Milestone yet.
  const milestoneActiveSlugs = listActiveIterationSlugs(owner, repoName).map((m) => m.slug)
  const issueMilestones = milestoneActiveSlugs.flatMap((slug) =>
    listIssueMilestonesForSlug(owner, repoName, slug).map((f) => ({ iteration: slug, ...f }))
  )
  results.push(checkL4(milestoneActiveSlugs, issueMilestones))

  // L5 — forge-native Milestone-state coherence (Issue #481, drift class #2):
  // an open Milestone whose every task Issue is closed. Advisory analogue of
  // file-based L1 for post-cutover iterations that have no topology file.
  results.push(checkL5(milestoneActiveSlugs, entriesBySlug))

  // N/M stubs
  results.push(...checkM1M2M3())

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

  // --closes-n: Closes #N gate for task branches (CI Layer 1).
  // Reads BRANCH and PR_BODY from env. Exits 0 on pass/bypass, 1 on fail.
  if (args.includes('--closes-n')) {
    const branch = process.env.BRANCH ?? ''
    const prBody = process.env.PR_BODY ?? ''
    if (!branch) {
      console.warn('closes-n: BRANCH env var not set — skipping (non-task context).')
      process.exit(0)
    }
    // Scoped load: checkClosesN only ever reads the ONE iteration named in
    // the branch — deriving every other iteration from the forge here would
    // pay the full repo-wide sweep's latency for data this gate never uses.
    const branchIterSlug = branch.match(/^task\/([^/]+)\//)?.[1]
    const files = await loadIterationFiles(null, branchIterSlug)

    // Reverse-direction data: resolve every `Closes #N` the body references
    // to its AEG task identity, one batched forge query (not a per-issue
    // loop — see `fetchTaskIssueRefs`'s own doc comment). A non-task branch
    // (no `repo` resolvable, or the forge unreachable) still runs the
    // forward direction below; the reverse check simply has nothing to flag.
    const repo = await resolveRepo()
    const taskIssueRefs = repo
      ? await fetchTaskIssueRefs(repo.owner, repo.repo, [...extractClosesReferences(prBody)])
      : undefined
    const result = checkClosesN(branch, prBody, files, taskIssueRefs)
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

  // PR context for item 5/T2-relocation — set only by the
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
