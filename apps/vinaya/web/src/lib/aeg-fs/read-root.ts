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
 * Active vs. archived (`aeg-forge-state-v1` task 5, #429, per D-110):
 *   - Active   = a GitHub Milestone titled exactly the iteration slug, open.
 *                Goal/lifecycle/task-list all derive from the forge
 *                (`@atta/aeg-forge-state`'s `deriveIterationFromForge`) — the
 *                same adapter task 3a/3b already cut the CLI gates over to.
 *                `dependsOn`/`conflictsWith` are still merged in from
 *                `aeg-root/iterations/<slug>.md`'s topology table (see
 *                `mergeTaskEdgesFromFile`) — the same deliberate, temporary
 *                narrowing `verify-coherence.ts`'s `deriveOrFallback` already
 *                applies, not a permanent data source. Falls back to the
 *                file ENTIRELY only when the forge itself is unreachable (no
 *                repo resolvable, `gh` unavailable/unauthenticated).
 *   - Archived = files inside `aeg-root/iterations/completed/`, read
 *                directly, permanently — per task 7 (#431)'s own scope,
 *                completed topology files are the historical record and are
 *                never deleted or migrated ("history never migrates — ring 2
 *                reads the past where it lies").
 *
 * Reads are confined to this module. Parsing is delegated to
 * `@atta/aeg-core` (pure, no I/O) for the archived/fallback file path, and to
 * `@atta/aeg-forge-state` (pure I/O, no parsing logic re-implemented here)
 * for the active path. Consumers receive typed model objects.
 */

import 'server-only'
import { existsSync } from 'node:fs'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  parseIteration,
  parseRegistry,
  type Iteration,
  type Lifecycle,
  type Project,
  type Registry
} from '@atta/aeg-core'
import { deriveIterationFromForge, findMilestoneForSlug, listActiveIterationSlugs } from '@atta/aeg-forge-state'
import { loadIterationProgress } from '@/lib/forge/load-snapshot'
import { resolveRepo } from '@/lib/forge/resolve-repo'

const ITERATIONS_DIR = 'iterations'
const COMPLETED_DIR = 'completed'
const REGISTRY_FILE = 'projects.md'
const GOVERNANCE_DIR = 'packages/governance'

export type IterationSummary = {
  /** Slug from the Milestone title (active) or the file's H1 (archived). */
  name: string
  /** Filename slug — what the URL uses. Same as `name` for live files, but
   *  resilient against H1/filename divergence. */
  fileSlug: string
  /** Source of truth: active = forge Milestone, archived = file location. */
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

async function listIterationFiles(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return []
  const entries = await fs.readdir(dir, { withFileTypes: true })
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.md') && e.name !== 'README.md' && !e.name.endsWith('.tokens.md'))
    .map((e) => e.name)
}

async function readOne(dir: string, file: string): Promise<{ fileSlug: string; iteration: Iteration }> {
  const raw = await fs.readFile(path.join(dir, file), 'utf8')
  return { fileSlug: file.replace(/\.md$/, ''), iteration: parseIteration(raw) }
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
 * same adapter 3a/3b already proved against this repo's real data. Falls
 * back to reading `aeg-root/iterations/*.md` directly (excluding
 * `completed/`) only when the forge itself can't be reached at all (no repo
 * resolvable, or the forge call throws — no token/`gh` unavailable/network) —
 * mirrors `verify-coherence.ts`'s `deriveOrFallback` "never let one signal's
 * unavailability crash the whole oracle" discipline.
 */
export async function loadActiveIterations(): Promise<Array<{ fileSlug: string; iteration: Iteration }>> {
  const repo = await resolveRepo()
  if (repo) {
    try {
      const refs = listActiveIterationSlugs(repo.owner, repo.repo)
      return await Promise.all(
        refs.map(async (ref) => {
          const [iteration, fileIteration] = await Promise.all([
            deriveIterationFromForge(repo.owner, repo.repo, ref.slug),
            readActiveFile(ref.slug)
          ])
          return { fileSlug: ref.slug, iteration: mergeTaskEdgesFromFile(iteration, fileIteration) }
        })
      )
    } catch (err) {
      console.warn(
        `[aeg-fs] active-iteration forge enumeration failed — falling back to file read: ${(err as Error).message}`
      )
    }
  }

  const root = findAegRoot()
  const activeDir = path.join(root, ITERATIONS_DIR)
  const activeFiles = await listIterationFiles(activeDir)
  return Promise.all(activeFiles.map((f) => readOne(activeDir, f)))
}

async function readActiveIteration(fileSlug: string): Promise<{ fileSlug: string; iteration: Iteration } | null> {
  const repo = await resolveRepo()
  if (!repo) {
    // Forge wholly unreachable in this environment — best-effort file read,
    // same graceful-degrade contract as the rest of the forge adapter.
    const fileIteration = await readActiveFile(fileSlug)
    return fileIteration ? { fileSlug, iteration: fileIteration } : null
  }

  try {
    const milestone = findMilestoneForSlug(repo.owner, repo.repo, fileSlug)
    if (milestone?.lifecycle !== 'active') return null
    const [iteration, fileIteration] = await Promise.all([
      deriveIterationFromForge(repo.owner, repo.repo, fileSlug),
      readActiveFile(fileSlug)
    ])
    return { fileSlug, iteration: mergeTaskEdgesFromFile(iteration, fileIteration) }
  } catch (err) {
    console.warn(
      `[aeg-fs] forge derivation failed for iteration "${fileSlug}" — falling back to file read: ${(err as Error).message}`
    )
    const fileIteration = await readActiveFile(fileSlug)
    return fileIteration ? { fileSlug, iteration: fileIteration } : null
  }
}

// ---------- public API ----------

export type IterationLists = {
  active: IterationSummary[]
  archived: IterationSummary[]
}

export async function listIterations(): Promise<IterationLists> {
  const root = findAegRoot()
  const archivedDir = path.join(root, ITERATIONS_DIR, COMPLETED_DIR)
  const archivedFiles = await listIterationFiles(archivedDir)

  const [activeLoaded, archivedLoaded] = await Promise.all([
    loadActiveIterations(),
    Promise.all(archivedFiles.map((f) => readOne(archivedDir, f)))
  ])

  return {
    active: await Promise.all(activeLoaded.map(({ fileSlug, iteration }) => toSummary(fileSlug, iteration, false))),
    archived: await Promise.all(archivedLoaded.map(({ fileSlug, iteration }) => toSummary(fileSlug, iteration, true)))
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

  const root = findAegRoot()
  const archivedPath = path.join(root, ITERATIONS_DIR, COMPLETED_DIR, `${fileSlug}.md`)
  if (existsSync(archivedPath)) {
    const raw = await fs.readFile(archivedPath, 'utf8')
    return { fileSlug, archived: true, iteration: parseIteration(raw) }
  }
  return undefined
}

/**
 * Group iterations by project. An iteration belongs to a project iff any task
 * in its `## Tasks (topology)` table lists the project. The same iteration may
 * appear under multiple projects — that is correct and intentional (a
 * cross-project task is a normal shape, per `projects.md`).
 */
export async function iterationsForProject(
  projectName: string
): Promise<{ active: IterationSummary[]; archived: IterationSummary[] }> {
  const root = findAegRoot()
  const archivedDir = path.join(root, ITERATIONS_DIR, COMPLETED_DIR)
  const archivedFiles = await listIterationFiles(archivedDir)

  const [activeLoaded, archivedLoaded] = await Promise.all([
    loadActiveIterations(),
    Promise.all(archivedFiles.map((f) => readOne(archivedDir, f)))
  ])

  const activeFiltered = activeLoaded.filter(({ iteration }) =>
    iteration.tasks.some((t) => t.projects.includes(projectName))
  )
  const archivedFiltered = archivedLoaded.filter(({ iteration }) =>
    iteration.tasks.some((t) => t.projects.includes(projectName))
  )

  const [active, archived] = await Promise.all([
    Promise.all(activeFiltered.map(({ fileSlug, iteration }) => toSummary(fileSlug, iteration, false))),
    Promise.all(archivedFiltered.map(({ fileSlug, iteration }) => toSummary(fileSlug, iteration, true)))
  ])
  return { active, archived }
}
