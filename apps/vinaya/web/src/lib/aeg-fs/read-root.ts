/**
 * Server-only reads of the repo's iteration/project state.
 *
 * The Studio runs from `apps/aeg/web/studio`; `aeg-root/` lives at the repo
 * root. `findAegRoot` walks up from `process.cwd()` until it finds a
 * directory containing `packages/governance/projects.md` (the project
 * registry — relocated from `aeg-root/projects.md`, `aeg-forge-state-v1`
 * task 2), then returns that directory's `aeg-root/`. Worktrees work the
 * same way — each worktree carries its own checkout of `aeg-root/` and
 * `packages/governance/`.
 *
 * Active vs. archived (`aeg-forge-state-v1` task 5, #429; #515, per D-110):
 * both derive purely from the forge — a GitHub Milestone
 * titled exactly the iteration slug (open = active, closed = archived).
 * Goal/lifecycle/task-list all derive via `@atta/aeg-forge-state`'s
 * `deriveIterationFromForge`, the same adapter the CLI gates use.
 * `dependsOn`/`conflictsWith` for an ACTIVE iteration are additionally merged
 * from a legacy `aeg-root/iterations/<slug>.md` topology table when one still
 * exists on disk (see `mergeTaskEdgesFromFile`) — a deliberate,
 * best-effort-only enrichment for any pre-cutover file that predates full
 * Issue-body "Dependency rationale" coverage, not a required data source; no
 * live iteration carries such a file after #512/#517 (the last one,
 * `aeg-drift-prevention-v1.md`, was deleted there), so this path is dormant
 * in practice and only degrades gracefully if one ever reappears. Archived
 * iterations never had a file merge and never will — their dependency edges
 * resolve entirely from each closed Issue's own body.
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
  listActiveIterationSlugs,
  listArchivedIterationSlugs,
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
 */
const cachedListActiveIterationSlugs = cache(listActiveIterationSlugs)
const cachedListArchivedIterationSlugs = cache(listArchivedIterationSlugs)
const cachedDeriveIterationFromForge = cache(deriveIterationFromForge)

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
    return { ...base, taskCounts: { total, done: total, ongoing: 0, todo: 0, forgeAvailable: true } }
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
      todo: progress.todo + progress.backlog + progress.blocked,
      forgeAvailable: !progress.unavailable
    }
  }
}

// ---------- active iterations: forge-first, file-fallback-on-error ----------

async function readActiveFile(fileSlug: string): Promise<Iteration | null> {
  const root = findAegRoot()
  const activePath = path.join(root, ITERATIONS_DIR, `${fileSlug}.md`)
  if (!existsSync(activePath)) return null
  const raw = await fs.readFile(activePath, 'utf8')
  return parseIteration(raw)
}

/**
 * `dependsOn`/`conflictsWith` are read from the topology table itself
 * (`parseIteration`) and merged onto the forge-derived tasks, NOT taken from
 * the forge — the same deliberate narrowing `verify-coherence.ts`'s
 * `deriveOrFallback` already applies (task 3b, #437) and for the same live
 * reason: an Issue's own "Dependency rationale" section can go stale when a
 * later Planner amendment updates the dependency set in prose without
 * editing the original literal `Depends-on:` line — confirmed live on this
 * very iteration's own #431 (`Depends-on: 3, 4, 5` in the original Boundary,
 * corrected to `3a, 3b, 4, 4b, 5` only by two later amendments; forge
 * derivation parses the first line, not the amendments). File-only tasks
 * (`#TBD` rows, no Issue cut yet) have no forge representation at all and
 * are appended as-is, same reasoning as `deriveOrFallback`.
 */
function mergeTaskEdgesFromFile(forgeIteration: Iteration, fileIteration: Iteration | null): Iteration {
  if (!fileIteration) return forgeIteration
  const forgeTaskIds = new Set(forgeIteration.tasks.map((t) => t.id))
  const fileTaskById = new Map(fileIteration.tasks.map((t) => [t.id, t]))

  const mergedTasks = forgeIteration.tasks.map((t) => {
    const fileTask = fileTaskById.get(t.id)
    if (!fileTask) return t
    return { ...t, dependsOn: fileTask.dependsOn, conflictsWith: fileTask.conflictsWith }
  })
  const fileOnlyTasks = fileIteration.tasks.filter((t) => !forgeTaskIds.has(t.id))

  return { ...forgeIteration, tasks: [...mergedTasks, ...fileOnlyTasks] }
}

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
    console.warn('[aeg-fs] active-iteration enumeration skipped: repository could not be resolved (forge unreachable)')
    return { items: [], status: { kind: 'unreachable' } }
  }

  let refs: ReturnType<typeof listActiveIterationSlugs>
  try {
    refs = cachedListActiveIterationSlugs(repo.owner, repo.repo)
  } catch (err) {
    console.warn(`[aeg-fs] active-iteration enumeration failed: ${(err as Error).message}`)
    return { items: [], status: { kind: 'unreachable' } }
  }

  const settled = await Promise.allSettled(
    refs.map(async (ref) => {
      const [iteration, fileIteration] = await Promise.all([
        cachedDeriveIterationFromForge(repo.owner, repo.repo, ref.slug),
        readActiveFile(ref.slug)
      ])
      return { fileSlug: ref.slug, iteration: mergeTaskEdgesFromFile(iteration, fileIteration) }
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
    console.warn(`[aeg-fs] active-iteration derivation failed for "${slug}": ${reason}`)
    failures.push({ slug, reason })
  })

  return { items, status: reduceSettled(refs.length, failures, false) }
}

/** Back-compat array-returning wrapper (consumed by `dispatch-readiness.ts`
 * and the `@/lib/aeg-fs` barrel — signature unchanged). */
export async function loadActiveIterations(): Promise<Array<{ fileSlug: string; iteration: Iteration }>> {
  return (await loadActiveIterationsWithStatus()).items
}

async function readActiveIteration(fileSlug: string): Promise<{ fileSlug: string; iteration: Iteration } | null> {
  const repo = await resolveRepo()
  if (!repo) return null

  try {
    const milestone = findMilestoneForSlug(repo.owner, repo.repo, fileSlug)
    if (milestone?.lifecycle !== 'active') return null
    const [iteration, fileIteration] = await Promise.all([
      cachedDeriveIterationFromForge(repo.owner, repo.repo, fileSlug),
      readActiveFile(fileSlug)
    ])
    return { fileSlug, iteration: mergeTaskEdgesFromFile(iteration, fileIteration) }
  } catch (err) {
    console.warn(`[aeg-fs] forge derivation failed for iteration "${fileSlug}": ${(err as Error).message}`)
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
    let refs: ReturnType<typeof listArchivedIterationSlugs> | null = null
    try {
      refs = cachedListArchivedIterationSlugs(repo.owner, repo.repo)
    } catch (err) {
      console.warn(`[aeg-fs] archived-iteration enumeration failed: ${(err as Error).message}`)
    }

    if (refs) {
      const settled = await Promise.allSettled(
        refs.map(async (ref) => ({
          fileSlug: ref.slug,
          iteration: await cachedDeriveIterationFromForge(repo.owner, repo.repo, ref.slug)
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
        console.warn(`[aeg-fs] archived-iteration derivation failed for "${slug}": ${reason}`)
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
      console.warn(`[aeg-fs] forge derivation failed for archived iteration "${fileSlug}": ${(err as Error).message}`)
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
