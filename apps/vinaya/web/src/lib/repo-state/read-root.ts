/**
 * Server-only reads of the repo's iteration/project state.
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
 * it finds a directory containing `packages/governance/projects.md` (the
 * project registry — relocated from `aeg-root/projects.md`,
 * `aeg-forge-state-v1` task 2), then returns that directory's `aeg-root/`.
 * Worktrees work the same way — each worktree carries its own checkout of
 * `aeg-root/` and `packages/governance/`.
 *
 * Active vs. archived (`aeg-forge-state-v1` task 5, #429; #515, per D-110):
 * both derive purely from the forge — a GitHub Milestone
 * titled exactly the iteration slug (open = active, closed = archived).
 * Goal/lifecycle/task-list all derive via `@atta/aeg-forge-state`'s
 * `deriveIterationFromForge`, the same adapter the CLI gates use.
 * `dependsOn`/`conflictsWith` for an ACTIVE iteration derive from the forge
 * like everything else. A legacy `aeg-root/iterations/<slug>.md` topology
 * table was once merged in as best-effort enrichment for pre-cutover files;
 * that path was removed by `deprecation-v1` task 1 (D-131) once it was
 * provably unreachable — no live iteration has carried such a file since
 * #512/#517 deleted the last one (`aeg-drift-prevention-v1.md`), and
 * `check-no-disk-state.ts` now CI-blocks adding a new active topology file
 * at all. Archived iterations never had a file merge and never will — their
 * dependency edges resolve entirely from each closed Issue's own body.
 *
 * Reads are confined to this module. Parsing is delegated to
 * `@atta/aeg-core` (pure, no I/O) for the legacy file-merge path, and to
 * `@atta/aeg-forge-state` (pure I/O, no parsing logic re-implemented here)
 * for everything else. Consumers receive typed model objects.
 */

import 'server-only'
import { existsSync } from 'node:fs'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { cache } from 'react'
import {
  parseIteration,
  parseRegistry,
  type Iteration,
  type Lifecycle,
  type Project,
  type Registry
} from '@atta/aeg-core'
import {
  deriveIterationFromForge,
  findMilestoneForSlug,
  listActiveIterationSlugsAsync,
  listArchivedIterationSlugsAsync,
  resolveRepo
} from '@atta/aeg-forge-state'
import { loadIterationProgress } from '@/lib/forge/load-snapshot'
import { type ForgeSlugFailure, type ForgeStatus, reduceSettled } from './forge-status'

/**
 * Request-scoped memoization (React 19 `cache()`) so one request never
 * re-fires an identical forge lookup — e.g. `listIterations()` plus a detail
 * read in the same render tree. Request-scoped ONLY: no module-level TTL, no
 * cross-request store (D-087, Studio stores nothing). `@atta/aeg-forge-state`'s
 * own exports stay unwrapped; these wrappers are local to this module.
 *
 * The enumeration path uses the ASYNC `gh` twins: `execFileSync` blocks the
 * event loop, so the sync enumeration serialized every `Promise.allSettled`
 * fan-out below into strictly-sequential `gh` spawns. The async twins let them
 * genuinely overlap. `cache()` wrapping an async function memoizes the returned
 * promise — fine.
 *
 * TWO derive wrappers, and the split is load-bearing:
 *   - `cachedDeriveIterationFromForge` (3 primitive args) — the single-slug
 *     detail paths (`readActiveIteration`/`readArchivedIteration`), which have
 *     no pre-known Milestone and still call `findMilestoneForSlug` for their
 *     404 existence logic.
 *   - `cachedDeriveIterationFromForgeKnown` (5 PRIMITIVE args) — the
 *     enumeration paths, which already listed every Milestone up front so goal
 *     comes from the ref and lifecycle is fixed per list. It passes those as
 *     primitives and reconstructs the `{ goal, lifecycle }` object INSIDE the
 *     cached fn. Passing a fresh object as an arg to a `cache()`-wrapped fn
 *     would break request dedup — `cache()` keys by `Object.is` per argument,
 *     so a new object literal is a new key every call, and `loadActiveIterations`
 *     is invoked more than once per request (the dashboard-readiness path
 *     re-reads it). Primitive keys dedup correctly; skipping the redundant
 *     per-slug `findMilestoneForSlug` re-fetch is the whole point of the split.
 */
const cachedListActiveIterationSlugs = cache(listActiveIterationSlugsAsync)
const cachedListArchivedIterationSlugs = cache(listArchivedIterationSlugsAsync)
const cachedDeriveIterationFromForge = cache(deriveIterationFromForge)
const cachedDeriveIterationFromForgeKnown = cache(
  (owner: string, repo: string, slug: string, goal: string, lifecycle: Lifecycle) =>
    deriveIterationFromForge(owner, repo, slug, { goal, lifecycle })
)

const ITERATIONS_DIR = 'iterations'
const REGISTRY_FILE = 'projects.md'
const GOVERNANCE_DIR = 'packages/governance'

export type IterationSummary = {
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
  /** Deduplicated project names referenced across all tasks in this iteration. */
  projects: string[]
  taskCounts: {
    total: number
    done: number
    ongoing: number
    todo: number
    blocked: number
    forgeAvailable: boolean
  }
  /** Task identity refs for forge progress queries — `{ id, issue }` per task.
   *  `issue` is `null` when the topology carries `#TBD`; the forge loader
   *  resolves real issue numbers via the `iteration:<slug>` label. */
  taskRefs: Array<{ id: string; issue: number | null }>
}

let cachedRoot: string | null = null

export function findAegRoot(): string {
  if (cachedRoot) return cachedRoot
  let dir = process.cwd()
  for (let i = 0; i < 8; i++) {
    const candidate = path.join(dir, GOVERNANCE_DIR, REGISTRY_FILE)
    if (existsSync(candidate)) {
      cachedRoot = path.join(dir, 'aeg-root')
      return cachedRoot
    }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  throw new Error('Could not locate aeg-root/ above process.cwd()')
}

export async function readRegistry(): Promise<Registry> {
  const root = findAegRoot()
  const repoRoot = path.dirname(root)
  const raw = await fs.readFile(path.join(repoRoot, GOVERNANCE_DIR, REGISTRY_FILE), 'utf8')
  return parseRegistry(raw)
}

export async function readProject(name: string): Promise<Project | undefined> {
  const registry = await readRegistry()
  return registry.find((p) => p.name === name)
}

async function toSummary(fileSlug: string, iteration: Iteration, archived: boolean): Promise<IterationSummary> {
  const seen = new Set<string>()
  for (const task of iteration.tasks) {
    for (const p of task.projects) seen.add(p)
  }

  const total = iteration.tasks.length
  const base = {
    name: iteration.name || fileSlug,
    fileSlug,
    archived,
    lifecycle: iteration.lifecycle,
    goal: iteration.goal,
    taskCount: total,
    projects: Array.from(seen),
    taskRefs: iteration.tasks.map((t) => ({ id: t.id, issue: t.issue }))
  }

  // Archived iterations are complete by definition — skip GitHub entirely.
  if (archived) {
    return { ...base, taskCounts: { total, done: total, ongoing: 0, todo: 0, blocked: 0, forgeAvailable: true } }
  }

  // Active: use loadIterationProgress, which resolves #TBD issue numbers via
  // the iteration:<slug> label (D-055) before fetching forge facts.
  const progress = await loadIterationProgress(base.taskRefs, fileSlug)
  return {
    ...base,
    taskCounts: {
      total,
      done: progress.merged,
      ongoing: progress.active,
      todo: progress.todo + progress.backlog,
      blocked: progress.blocked,
      forgeAvailable: !progress.unavailable
    }
  }
}

// ---------- active iterations: forge-derived ----------

/**
 * Enumerates every active iteration from the forge (open Milestones) and
 * derives each one's full `Iteration` via `deriveIterationFromForge` — the
 * same adapter 3a/3b already proved against this repo's real data. Returns
 * `[]` when the forge can't be reached at all (no repo resolvable, or the
 * forge call throws — no token/`gh` unavailable/network) — there is no
 * on-disk enumeration source left to fall back to (#515).
 */
/**
 * A loaded iteration list plus a structured `ForgeStatus` for this request.
 * `ok`/`partial`/`unreachable` (never a single boolean — an AND across
 * active+archived, or across every slug within one list, is the exact lie
 * this type replaces: one transient per-slug failure used to discard every
 * surviving iteration). The caller degrades *visibly and granularly* (an
 * explicit banner naming the failed subset) instead of rendering a failure as
 * truth-shaped emptiness (D-087: Studio stores nothing, so it must not lie by
 * omission). The legacy `completed/*.md` supplement never affects status.
 */
type LoadedIterations = {
  items: Array<{ fileSlug: string; iteration: Iteration }>
  status: ForgeStatus
}

async function loadActiveIterationsWithStatus(): Promise<LoadedIterations> {
  const repo = await resolveRepo()
  if (!repo) {
    console.warn(
      '[repo-state] active-iteration enumeration skipped: repository could not be resolved (forge unreachable)'
    )
    return { items: [], status: { kind: 'unreachable' } }
  }

  let refs: Awaited<ReturnType<typeof listActiveIterationSlugsAsync>>
  try {
    refs = await cachedListActiveIterationSlugs(repo.owner, repo.repo)
  } catch (err) {
    console.warn(`[repo-state] active-iteration enumeration failed: ${(err as Error).message}`)
    return { items: [], status: { kind: 'unreachable' } }
  }

  const settled = await Promise.allSettled(
    refs.map(async (ref) => {
      const iteration = await cachedDeriveIterationFromForgeKnown(repo.owner, repo.repo, ref.slug, ref.goal, 'active')
      return { fileSlug: ref.slug, iteration }
    })
  )

  const items: Array<{ fileSlug: string; iteration: Iteration }> = []
  const failures: ForgeSlugFailure[] = []
  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      items.push(result.value)
      return
    }
    const slug = refs[i]?.slug ?? '(unknown)'
    const reason = result.reason instanceof Error ? result.reason.message : String(result.reason)
    console.warn(`[repo-state] active-iteration derivation failed for "${slug}": ${reason}`)
    failures.push({ slug, reason })
  })

  return { items, status: reduceSettled(refs.length, failures, false) }
}

/** Back-compat array-returning wrapper (consumed by `dispatch-readiness.ts`
 * and the `@/lib/repo-state` barrel — signature unchanged). */
export async function loadActiveIterations(): Promise<Array<{ fileSlug: string; iteration: Iteration }>> {
  return (await loadActiveIterationsWithStatus()).items
}

async function readActiveIteration(fileSlug: string): Promise<{ fileSlug: string; iteration: Iteration } | null> {
  const repo = await resolveRepo()
  if (!repo) return null

  try {
    const milestone = findMilestoneForSlug(repo.owner, repo.repo, fileSlug)
    if (milestone?.lifecycle !== 'active') return null
    const iteration = await cachedDeriveIterationFromForge(repo.owner, repo.repo, fileSlug)
    return { fileSlug, iteration }
  } catch (err) {
    console.warn(`[repo-state] forge derivation failed for iteration "${fileSlug}": ${(err as Error).message}`)
    return null
  }
}

// ---------- archived iterations: forge-first, legacy-file-fallback ----------

async function listCompletedFileSlugs(): Promise<string[]> {
  const root = findAegRoot()
  const dir = path.join(root, ITERATIONS_DIR, 'completed')
  if (!existsSync(dir)) return []
  const names = await fs.readdir(dir)
  return names.filter((n) => n.endsWith('.md') && !n.endsWith('.tokens.md')).map((n) => n.replace(/\.md$/, ''))
}

async function readCompletedFile(fileSlug: string): Promise<Iteration | null> {
  const root = findAegRoot()
  const completedPath = path.join(root, ITERATIONS_DIR, 'completed', `${fileSlug}.md`)
  if (!existsSync(completedPath)) return null
  const raw = await fs.readFile(completedPath, 'utf8')
  return parseIteration(raw)
}

/**
 * Enumerates every archived iteration from the forge (closed Milestones),
 * deriving each one's full `Iteration` via `deriveIterationFromForge` — then
 * supplements with any `aeg-root/iterations/completed/*.md` file whose slug
 * wasn't already resolved via a Milestone. That supplement is the permanent
 * home of the small, closed, non-growing set of pre-Milestone-era legacy
 * iterations (`aeg-forge-state-v1` task 5, #515) — no Milestone exists for
 * them at all, so the closed-Milestone enumeration can never surface them.
 * Mirrors the same "enumerate, then fill the gap" shape as
 * `verify-coherence.ts`'s general sweep (#515).
 */
async function loadArchivedIterationsWithStatus(): Promise<LoadedIterations> {
  const results: Array<{ fileSlug: string; iteration: Iteration }> = []
  const repo = await resolveRepo()
  let status: ForgeStatus = { kind: 'unreachable' }

  if (repo) {
    let refs: Awaited<ReturnType<typeof listArchivedIterationSlugsAsync>> | null = null
    try {
      refs = await cachedListArchivedIterationSlugs(repo.owner, repo.repo)
    } catch (err) {
      console.warn(`[repo-state] archived-iteration enumeration failed: ${(err as Error).message}`)
    }

    if (refs) {
      const settled = await Promise.allSettled(
        refs.map(async (ref) => ({
          fileSlug: ref.slug,
          iteration: await cachedDeriveIterationFromForgeKnown(repo.owner, repo.repo, ref.slug, ref.goal, 'complete')
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
        console.warn(`[repo-state] archived-iteration derivation failed for "${slug}": ${reason}`)
        failures.push({ slug, reason })
      })
      status = reduceSettled(refs.length, failures, false)
    }
  }

  // Legacy `completed/*.md` supplement — the permanent home of pre-Milestone
  // iterations (#515). NOT a failure: it never affects `status`.
  const seen = new Set(results.map((r) => r.fileSlug))
  for (const slug of await listCompletedFileSlugs()) {
    if (seen.has(slug)) continue
    const iteration = await readCompletedFile(slug)
    if (iteration) results.push({ fileSlug: slug, iteration })
  }

  return { items: results, status }
}

/** Back-compat array-returning wrapper (signature unchanged for any consumer). */
export async function loadArchivedIterations(): Promise<Array<{ fileSlug: string; iteration: Iteration }>> {
  return (await loadArchivedIterationsWithStatus()).items
}

async function readArchivedIteration(fileSlug: string): Promise<{ fileSlug: string; iteration: Iteration } | null> {
  const repo = await resolveRepo()

  if (repo) {
    try {
      const milestone = findMilestoneForSlug(repo.owner, repo.repo, fileSlug)
      if (milestone) {
        if (milestone.lifecycle !== 'complete') return null
        const iteration = await cachedDeriveIterationFromForge(repo.owner, repo.repo, fileSlug)
        return { fileSlug, iteration }
      }
    } catch (err) {
      console.warn(
        `[repo-state] forge derivation failed for archived iteration "${fileSlug}": ${(err as Error).message}`
      )
      return null
    }
  }

  // No Milestone resolves for this slug (repo unreachable, or a
  // pre-Milestone-era legacy iteration, #515) — fall back to the
  // completed/*.md file directly.
  const iteration = await readCompletedFile(fileSlug)
  return iteration ? { fileSlug, iteration } : null
}

// ---------- public API ----------

export type IterationLists = {
  active: IterationSummary[]
  archived: IterationSummary[]
  /** Per-list forge status — deliberately NOT ANDed into one signal (that AND
   *  was the lie: a consumer could never tell "active enumeration died" from
   *  "one archived slug failed"). The UI renders each independently. */
  forge: { active: ForgeStatus; archived: ForgeStatus }
}

export async function listIterations(): Promise<IterationLists> {
  const [activeLoaded, archivedLoaded] = await Promise.all([
    loadActiveIterationsWithStatus(),
    loadArchivedIterationsWithStatus()
  ])

  return {
    active: await Promise.all(
      activeLoaded.items.map(({ fileSlug, iteration }) => toSummary(fileSlug, iteration, false))
    ),
    archived: await Promise.all(
      archivedLoaded.items.map(({ fileSlug, iteration }) => toSummary(fileSlug, iteration, true))
    ),
    forge: { active: activeLoaded.status, archived: archivedLoaded.status }
  }
}

export type IterationDetail = {
  fileSlug: string
  archived: boolean
  iteration: Iteration
}

export async function readIteration(fileSlug: string): Promise<IterationDetail | undefined> {
  const active = await readActiveIteration(fileSlug)
  if (active) return { fileSlug: active.fileSlug, archived: false, iteration: active.iteration }

  const archived = await readArchivedIteration(fileSlug)
  if (archived) return { fileSlug: archived.fileSlug, archived: true, iteration: archived.iteration }

  return undefined
}

/**
 * Group iterations by project. An iteration belongs to a project iff any task
 * in its `## Tasks (topology)` table lists the project. The same iteration may
 * appear under multiple projects — that is correct and intentional (a
 * cross-project task is a normal shape, per `projects.md`).
 */
export async function iterationsForProject(projectName: string): Promise<{
  active: IterationSummary[]
  archived: IterationSummary[]
  forge: { active: ForgeStatus; archived: ForgeStatus }
}> {
  const [activeLoaded, archivedLoaded] = await Promise.all([
    loadActiveIterationsWithStatus(),
    loadArchivedIterationsWithStatus()
  ])

  const activeFiltered = activeLoaded.items.filter(({ iteration }) =>
    iteration.tasks.some((t) => t.projects.includes(projectName))
  )
  const archivedFiltered = archivedLoaded.items.filter(({ iteration }) =>
    iteration.tasks.some((t) => t.projects.includes(projectName))
  )

  const [active, archived] = await Promise.all([
    Promise.all(activeFiltered.map(({ fileSlug, iteration }) => toSummary(fileSlug, iteration, false))),
    Promise.all(archivedFiltered.map(({ fileSlug, iteration }) => toSummary(fileSlug, iteration, true)))
  ])
  return { active, archived, forge: { active: activeLoaded.status, archived: archivedLoaded.status } }
}
