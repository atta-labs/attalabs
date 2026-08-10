/**
 * Server-only reads of the repo's tranche/project state.
 *
 * This module ran as `lib/aeg-fs` until #553 — a name carried over verbatim
 * when the Studio was ported here (#493) and never revisited. Vinaya names
 * nothing after AEG: a Vinaya reader has no reason to know that word, and
 * this module is Vinaya's own state reader, not a shared one (it is
 * app-private — no package export, no tsconfig path). `findAegRoot` keeps its
 * name because it returns the literal `aeg-root/` directory; renaming a
 * function away from the thing it actually finds would be worse than the
 * word. That directory is the substrate's, not Vinaya's, and renaming it is a
 * separate, monorepo-wide question.
 *
 * Vinaya's Studio runs from `apps/vinaya/web/src/app/studio`; `aeg-root/`
 * lives at the repo root. `findAegRoot` walks up from `process.cwd()` until
 * it finds a directory containing `.vinaya/projects.md` (the project
 * registry — configuration since the governance package was removed), then
 * returns that directory's `aeg-root/`.
 * Worktrees work the same way — each worktree carries its own checkout of
 * `aeg-root/` and `.vinaya/`.
 *
 * Active vs. archived (`aeg-forge-state-v1` task 5, #429; #515, ):
 * both derive purely from the forge — a GitHub Milestone
 * titled exactly the tranche slug (open = active, closed = archived).
 * Goal/lifecycle/task-list all derive via `@atta/aeg-forge-state`'s
 * `deriveTrancheFromForge`, the same adapter the CLI gates use.
 * `dependsOn`/`conflictsWith` for an ACTIVE tranche derive from the forge
 * like everything else. A legacy `aeg-root/tranches/<slug>.md` topology
 * table was once merged in as best-effort enrichment for pre-cutover files;
 * that path was removed by `deprecation-v1` task 1 once it was
 * provably unreachable — no live tranche has carried such a file since
 * #512/#517 deleted the last one (`aeg-drift-prevention-v1.md`), and
 * `check-no-disk-state.ts` now CI-blocks adding a new active topology file
 * at all. Archived tranches never had a file merge and never will — their
 * dependency edges resolve entirely from each closed Issue's own body.
 *
 * Reads are confined to this module. Parsing is delegated to
 * `@atta/aeg-core` (pure, no I/O) for the archived/completed topology files,
 * the only files this module still parses, and to `@atta/aeg-forge-state`
 * (pure I/O, no parsing logic re-implemented here) for everything else.
 * Consumers receive typed model objects.
 */

import 'server-only'
import { existsSync } from 'node:fs'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { cache } from 'react'
import { parseTranche, parseRegistry, type Tranche, type Lifecycle, type Project, type Registry } from '@atta/aeg-core'
import {
  deriveTrancheFromForge,
  findMilestoneForSlug,
  listActiveTrancheSlugsAsync,
  listArchivedTrancheSlugsAsync,
  resolveRepo
} from '@atta/aeg-forge-state'
import { loadTrancheProgress } from '@/lib/forge/load-snapshot'
import { emptyTaskBuckets, type TaskBuckets } from '@/lib/forge/task-buckets'
import { type ForgeSlugFailure, type ForgeStatus, reduceSettled } from './forge-status'

/**
 * Request-scoped memoization (React 19 `cache()`) so one request never
 * re-fires an identical forge lookup — e.g. `listTranches()` plus a detail
 * read in the same render tree. Request-scoped ONLY: no module-level TTL, no
 * cross-request store (Studio stores nothing). `@atta/aeg-forge-state`'s
 * own exports stay unwrapped; these wrappers are local to this module.
 *
 * The enumeration path uses the ASYNC `gh` twins: `execFileSync` blocks the
 * event loop, so the sync enumeration serialized every `Promise.allSettled`
 * fan-out below into strictly-sequential `gh` spawns. The async twins let them
 * genuinely overlap. `cache()` wrapping an async function memoizes the returned
 * promise — fine.
 *
 * TWO derive wrappers, and the split is load-bearing:
 *   - `cachedDeriveTrancheFromForge` (3 primitive args) — the single-slug
 *     detail paths (`readActiveTranche`/`readArchivedTranche`), which have
 *     no pre-known Milestone and still call `findMilestoneForSlug` for their
 *     404 existence logic.
 *   - `cachedDeriveTrancheFromForgeKnown` (5 PRIMITIVE args) — the
 *     enumeration paths, which already listed every Milestone up front so goal
 *     comes from the ref and lifecycle is fixed per list. It passes those as
 *     primitives and reconstructs the `{ goal, lifecycle }` object INSIDE the
 *     cached fn. Passing a fresh object as an arg to a `cache()`-wrapped fn
 *     would break request dedup — `cache()` keys by `Object.is` per argument,
 *     so a new object literal is a new key every call, and `loadActiveTranches`
 *     is invoked more than once per request (the dashboard-readiness path
 *     re-reads it). Primitive keys dedup correctly; skipping the redundant
 *     per-slug `findMilestoneForSlug` re-fetch is the whole point of the split.
 */
const cachedListActiveTrancheSlugs = cache(listActiveTrancheSlugsAsync)
const cachedListArchivedTrancheSlugs = cache(listArchivedTrancheSlugsAsync)
const cachedDeriveTrancheFromForge = cache(deriveTrancheFromForge)
const cachedDeriveTrancheFromForgeKnown = cache(
  (owner: string, repo: string, slug: string, goal: string, lifecycle: Lifecycle) =>
    deriveTrancheFromForge(owner, repo, slug, { goal, lifecycle })
)

const TRANCHES_DIR = 'tranches'
const REGISTRY_FILE = 'projects.md'
const CONFIG_DIR = '.vinaya'

export type TrancheSummary = {
  /** Slug from the Milestone title. */
  name: string
  /** Filename slug — what the URL uses. Same as `name`; kept as a distinct
   *  field since it's the historical key every consumer still keys off. */
  fileSlug: string
  /** Source of truth: active = open Milestone, archived = closed Milestone. */
  archived: boolean
  /** In-file `Lifecycle:` marker. Defaults to `'active'` when absent. */
  lifecycle: Lifecycle
  /** First-paragraph goal — empty when missing. */
  goal: string
  /** Number of rows in `## Tasks (topology)`. */
  taskCount: number
  /** Deduplicated project names referenced across all tasks in this tranche. */
  projects: string[]
  /**
   * The shared `TaskBuckets` (see `@/lib/forge/task-buckets`) plus whether the
   * forge could be read at all. Every bucket is carried through as itself —
   * `dropped` in particular is neither folded into `done` (it never shipped)
   * nor into `todo` (there is nothing left to do), which is what a tranche
   * card needs to render a resolved-but-unshipped task honestly.
   */
  taskCounts: TaskBuckets & { forgeAvailable: boolean }
  /** Task identity refs for forge progress queries — `{ id, issue }` per task.
   *  `issue` is `null` when the topology carries `#TBD`; the forge loader
   *  resolves real issue numbers via the `vinaya/tranche:<slug>` label. */
  taskRefs: Array<{ id: string; issue: number | null }>
}

let cachedRoot: string | null = null

/** Test-only: resets the module-level cache between test cases. Not exported from any public index. */
export function __resetAegRootCacheForTests(): void {
  cachedRoot = null
}

/**
 * Walks up from `process.cwd()` for `.vinaya/projects.md`. Returns `null`,
 * never throws, when none is found — a single-project repo has no
 * `.vinaya/projects.md` at all (per that file's own doctrine: "the field is
 * omitted" when there's nothing to disambiguate), so a missing registry is a
 * normal, common state, not an error. Every caller in this module treats
 * `null` as "no local repo-state to read" and degrades to the same
 * safe-empty behavior `resolveRepo() === null` already gets throughout this
 * file — never a crash.
 *
 * Only a SUCCESSFUL search is cached (`cachedRoot`) — a failed search is
 * never memoized, so a registry file created after process start (e.g.
 * `vinaya init product` run against an already-running dev server) is picked
 * up on the very next call, matching the pre-null-return behavior where a
 * failed search threw every call and self-healed the moment the file
 * appeared.
 */
export function findAegRoot(startDir: string = process.cwd()): string | null {
  if (cachedRoot) return cachedRoot
  let dir = startDir
  for (let i = 0; i < 8; i++) {
    const candidate = path.join(dir, CONFIG_DIR, REGISTRY_FILE)
    if (existsSync(candidate)) {
      cachedRoot = path.join(dir, 'aeg-root')
      return cachedRoot
    }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

export async function readRegistry(startDir?: string): Promise<Registry> {
  const root = findAegRoot(startDir)
  if (root === null) return []
  const repoRoot = path.dirname(root)
  const raw = await fs.readFile(path.join(repoRoot, CONFIG_DIR, REGISTRY_FILE), 'utf8')
  return parseRegistry(raw)
}

export async function readProject(name: string): Promise<Project | undefined> {
  const registry = await readRegistry()
  return registry.find((p) => p.name === name)
}

async function toSummary(fileSlug: string, tranche: Tranche, archived: boolean): Promise<TrancheSummary> {
  const seen = new Set<string>()
  for (const task of tranche.tasks) {
    for (const p of task.projects) seen.add(p)
  }

  const total = tranche.tasks.length
  const base = {
    name: tranche.name || fileSlug,
    fileSlug,
    archived,
    lifecycle: tranche.lifecycle,
    goal: tranche.goal,
    taskCount: total,
    projects: Array.from(seen),
    taskRefs: tranche.tasks.map((t) => ({ id: t.id, issue: t.issue }))
  }

  // Archived tranches are complete by definition — skip GitHub entirely.
  //
  // `done: total` is the one place `done` is not merged-only, and it is a
  // deliberate carve-out from the dropped-is-not-done rule rather than an
  // exception to it: this branch reads no forge facts at all, so it cannot
  // know which of the tasks was dropped — only that the Milestone is closed,
  // which is the Tranche Archivist attesting the whole set reached a terminal
  // disposition. Nothing renders these counts as a ratio (`deriveTrancheStatus`
  // short-circuits on `archived`, and the `/studio` preview row lists active
  // tranches only), so the figure is a completeness marker, not a claim about
  // how many PRs merged. Splitting it honestly would mean fetching per-task
  // facts for every archived tranche on every list render.
  if (archived) {
    return { ...base, taskCounts: { ...emptyTaskBuckets(total), done: total, forgeAvailable: true } }
  }

  // Active: use loadTrancheProgress, which resolves #TBD issue numbers via
  // the tranche:<slug> label before fetching forge facts.
  const { unavailable, ...buckets } = await loadTrancheProgress(base.taskRefs, fileSlug)
  return {
    ...base,
    // `total` is the topology's own task count, which is authoritative over
    // however many tasks the forge resolved.
    taskCounts: { ...buckets, total, forgeAvailable: !unavailable }
  }
}

// ---------- active tranches: forge-derived ----------

/**
 * Enumerates every active tranche from the forge (open Milestones) and
 * derives each one's full `Tranche` via `deriveTrancheFromForge` — the
 * same adapter 3a/3b already proved against this repo's real data. Returns
 * `[]` when the forge can't be reached at all (no repo resolvable, or the
 * forge call throws — no token/`gh` unavailable/network) — there is no
 * on-disk enumeration source left to fall back to (#515).
 */
/**
 * A loaded tranche list plus a structured `ForgeStatus` for this request.
 * `ok`/`partial`/`unreachable` (never a single boolean — an AND across
 * active+archived, or across every slug within one list, is the exact lie
 * this type replaces: one transient per-slug failure used to discard every
 * surviving tranche). The caller degrades *visibly and granularly* (an
 * explicit banner naming the failed subset) instead of rendering a failure as
 * truth-shaped emptiness (Studio stores nothing, so it must not lie by
 * omission). The legacy `completed/*.md` supplement never affects status.
 */
type LoadedTranches = {
  items: Array<{ fileSlug: string; tranche: Tranche }>
  status: ForgeStatus
}

async function loadActiveTranchesWithStatus(): Promise<LoadedTranches> {
  const repo = await resolveRepo()
  if (!repo) {
    console.warn(
      '[repo-state] active-tranche enumeration skipped: repository could not be resolved (forge unreachable)'
    )
    return { items: [], status: { kind: 'unreachable' } }
  }

  let refs: Awaited<ReturnType<typeof listActiveTrancheSlugsAsync>>
  try {
    refs = await cachedListActiveTrancheSlugs(repo.owner, repo.repo)
  } catch (err) {
    console.warn(`[repo-state] active-tranche enumeration failed: ${(err as Error).message}`)
    return { items: [], status: { kind: 'unreachable' } }
  }

  const settled = await Promise.allSettled(
    refs.map(async (ref) => {
      const tranche = await cachedDeriveTrancheFromForgeKnown(repo.owner, repo.repo, ref.slug, ref.goal, 'active')
      return { fileSlug: ref.slug, tranche }
    })
  )

  const items: Array<{ fileSlug: string; tranche: Tranche }> = []
  const failures: ForgeSlugFailure[] = []
  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      items.push(result.value)
      return
    }
    const slug = refs[i]?.slug ?? '(unknown)'
    const reason = result.reason instanceof Error ? result.reason.message : String(result.reason)
    console.warn(`[repo-state] active-tranche derivation failed for "${slug}": ${reason}`)
    failures.push({ slug, reason })
  })

  return { items, status: reduceSettled(refs.length, failures, false) }
}

/** Back-compat array-returning wrapper (consumed by `dispatch-readiness.ts`
 * and the `@/lib/repo-state` barrel — signature unchanged). */
export async function loadActiveTranches(): Promise<Array<{ fileSlug: string; tranche: Tranche }>> {
  return (await loadActiveTranchesWithStatus()).items
}

async function readActiveTranche(fileSlug: string): Promise<{ fileSlug: string; tranche: Tranche } | null> {
  const repo = await resolveRepo()
  if (!repo) return null

  try {
    const milestone = findMilestoneForSlug(repo.owner, repo.repo, fileSlug)
    if (milestone?.lifecycle !== 'active') return null
    const tranche = await cachedDeriveTrancheFromForge(repo.owner, repo.repo, fileSlug)
    return { fileSlug, tranche }
  } catch (err) {
    console.warn(`[repo-state] forge derivation failed for tranche "${fileSlug}": ${(err as Error).message}`)
    return null
  }
}

// ---------- archived tranches: forge-first, legacy-file-fallback ----------

async function listCompletedFileSlugs(): Promise<string[]> {
  const root = findAegRoot()
  if (root === null) return []
  const dir = path.join(root, TRANCHES_DIR, 'completed')
  if (!existsSync(dir)) return []
  const names = await fs.readdir(dir)
  return names.filter((n) => n.endsWith('.md') && !n.endsWith('.tokens.md')).map((n) => n.replace(/\.md$/, ''))
}

async function readCompletedFile(fileSlug: string): Promise<Tranche | null> {
  const root = findAegRoot()
  if (root === null) return null
  const completedPath = path.join(root, TRANCHES_DIR, 'completed', `${fileSlug}.md`)
  if (!existsSync(completedPath)) return null
  const raw = await fs.readFile(completedPath, 'utf8')
  return parseTranche(raw)
}

/**
 * Enumerates every archived tranche from the forge (closed Milestones),
 * deriving each one's full `Tranche` via `deriveTrancheFromForge` — then
 * supplements with any `aeg-root/tranches/completed/*.md` file whose slug
 * wasn't already resolved via a Milestone. That supplement is the permanent
 * home of the small, closed, non-growing set of pre-Milestone-era legacy
 * tranches (`aeg-forge-state-v1` task 5, #515) — no Milestone exists for
 * them at all, so the closed-Milestone enumeration can never surface them.
 * Mirrors the same "enumerate, then fill the gap" shape as
 * `verify-coherence.ts`'s general sweep (#515).
 */
async function loadArchivedTranchesWithStatus(): Promise<LoadedTranches> {
  const results: Array<{ fileSlug: string; tranche: Tranche }> = []
  const repo = await resolveRepo()
  let status: ForgeStatus = { kind: 'unreachable' }

  if (repo) {
    let refs: Awaited<ReturnType<typeof listArchivedTrancheSlugsAsync>> | null = null
    try {
      refs = await cachedListArchivedTrancheSlugs(repo.owner, repo.repo)
    } catch (err) {
      console.warn(`[repo-state] archived-tranche enumeration failed: ${(err as Error).message}`)
    }

    if (refs) {
      const settled = await Promise.allSettled(
        refs.map(async (ref) => ({
          fileSlug: ref.slug,
          tranche: await cachedDeriveTrancheFromForgeKnown(repo.owner, repo.repo, ref.slug, ref.goal, 'complete')
        }))
      )
      const failures: ForgeSlugFailure[] = []
      settled.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
          return
        }
        const slug = refs?.[i]?.slug ?? '(unknown)'
        const reason = result.reason instanceof Error ? result.reason.message : String(result.reason)
        console.warn(`[repo-state] archived-tranche derivation failed for "${slug}": ${reason}`)
        failures.push({ slug, reason })
      })
      status = reduceSettled(refs.length, failures, false)
    }
  }

  // Legacy `completed/*.md` supplement — the permanent home of pre-Milestone
  // tranches (#515). NOT a failure: it never affects `status`.
  const seen = new Set(results.map((r) => r.fileSlug))
  for (const slug of await listCompletedFileSlugs()) {
    if (seen.has(slug)) continue
    const tranche = await readCompletedFile(slug)
    if (tranche) results.push({ fileSlug: slug, tranche })
  }

  return { items: results, status }
}

/** Back-compat array-returning wrapper (signature unchanged for any consumer). */
export async function loadArchivedTranches(): Promise<Array<{ fileSlug: string; tranche: Tranche }>> {
  return (await loadArchivedTranchesWithStatus()).items
}

async function readArchivedTranche(fileSlug: string): Promise<{ fileSlug: string; tranche: Tranche } | null> {
  const repo = await resolveRepo()

  if (repo) {
    try {
      const milestone = findMilestoneForSlug(repo.owner, repo.repo, fileSlug)
      if (milestone) {
        if (milestone.lifecycle !== 'complete') return null
        const tranche = await cachedDeriveTrancheFromForge(repo.owner, repo.repo, fileSlug)
        return { fileSlug, tranche }
      }
    } catch (err) {
      console.warn(`[repo-state] forge derivation failed for archived tranche "${fileSlug}": ${(err as Error).message}`)
      return null
    }
  }

  // No Milestone resolves for this slug (repo unreachable, or a
  // pre-Milestone-era legacy tranche, #515) — fall back to the
  // completed/*.md file directly.
  const tranche = await readCompletedFile(fileSlug)
  return tranche ? { fileSlug, tranche } : null
}

// ---------- public API ----------

export type TrancheLists = {
  active: TrancheSummary[]
  archived: TrancheSummary[]
  /** Per-list forge status — deliberately NOT ANDed into one signal (that AND
   *  was the lie: a consumer could never tell "active enumeration died" from
   *  "one archived slug failed"). The UI renders each independently. */
  forge: { active: ForgeStatus; archived: ForgeStatus }
}

export async function listTranches(): Promise<TrancheLists> {
  const [activeLoaded, archivedLoaded] = await Promise.all([
    loadActiveTranchesWithStatus(),
    loadArchivedTranchesWithStatus()
  ])

  return {
    active: await Promise.all(activeLoaded.items.map(({ fileSlug, tranche }) => toSummary(fileSlug, tranche, false))),
    archived: await Promise.all(
      archivedLoaded.items.map(({ fileSlug, tranche }) => toSummary(fileSlug, tranche, true))
    ),
    forge: { active: activeLoaded.status, archived: archivedLoaded.status }
  }
}

export type TrancheDetail = {
  fileSlug: string
  archived: boolean
  tranche: Tranche
}

export async function readTranche(fileSlug: string): Promise<TrancheDetail | undefined> {
  const active = await readActiveTranche(fileSlug)
  if (active) return { fileSlug: active.fileSlug, archived: false, tranche: active.tranche }

  const archived = await readArchivedTranche(fileSlug)
  if (archived) return { fileSlug: archived.fileSlug, archived: true, tranche: archived.tranche }

  return undefined
}

/**
 * Group tranches by project. A tranche belongs to a project iff any task
 * in its `## Tasks (topology)` table lists the project. The same tranche may
 * appear under multiple projects — that is correct and intentional (a
 * cross-project task is a normal shape, per `projects.md`).
 */
export async function tranchesForProject(projectName: string): Promise<{
  active: TrancheSummary[]
  archived: TrancheSummary[]
  forge: { active: ForgeStatus; archived: ForgeStatus }
}> {
  const [activeLoaded, archivedLoaded] = await Promise.all([
    loadActiveTranchesWithStatus(),
    loadArchivedTranchesWithStatus()
  ])

  const activeFiltered = activeLoaded.items.filter(({ tranche }) =>
    tranche.tasks.some((t) => t.projects.includes(projectName))
  )
  const archivedFiltered = archivedLoaded.items.filter(({ tranche }) =>
    tranche.tasks.some((t) => t.projects.includes(projectName))
  )

  const [active, archived] = await Promise.all([
    Promise.all(activeFiltered.map(({ fileSlug, tranche }) => toSummary(fileSlug, tranche, false))),
    Promise.all(archivedFiltered.map(({ fileSlug, tranche }) => toSummary(fileSlug, tranche, true)))
  ])
  return { active, archived, forge: { active: activeLoaded.status, archived: archivedLoaded.status } }
}
