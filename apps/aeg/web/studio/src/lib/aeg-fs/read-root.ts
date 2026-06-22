/**
 * Server-only reads of the repo's `aeg-root/` artifacts.
 *
 * The Studio runs from `apps/aeg/web/studio`; `aeg-root/` lives at the repo
 * root. `findAegRoot` walks up from `process.cwd()` until it finds a directory
 * containing `aeg-root/projects.md`. Worktrees work the same way — each
 * worktree carries its own checkout of `aeg-root/`.
 *
 * Reads are confined to this module. Parsing is delegated to
 * `@atta/aeg-core` (pure, no I/O). Consumers receive typed model objects.
 *
 * Active vs. archived (per `aeg-root/iterations/README.md` §11):
 *   - Active   = files at the top level of `aeg-root/iterations/` (excluding
 *                `README.md` and the `completed/` directory).
 *   - Archived = files inside `aeg-root/iterations/completed/`.
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
import { loadIterationSnapshot } from '@/lib/forge/load-snapshot'

const ITERATIONS_DIR = 'iterations'
const COMPLETED_DIR = 'completed'
const REGISTRY_FILE = 'projects.md'

export type IterationSummary = {
  /** Slug from the iteration file's H1 (e.g. `aeg-ui-v1`). */
  name: string
  /** Filename slug — what the URL uses. Same as `name` for live files, but
   *  resilient against H1/filename divergence. */
  fileSlug: string
  /** Source of truth: file location, not the in-file marker. */
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
}

let cachedRoot: string | null = null

export function findAegRoot(): string {
  if (cachedRoot) return cachedRoot
  let dir = process.cwd()
  for (let i = 0; i < 8; i++) {
    const candidate = path.join(dir, 'aeg-root', REGISTRY_FILE)
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
  const raw = await fs.readFile(path.join(root, REGISTRY_FILE), 'utf8')
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

export type IterationLists = {
  active: IterationSummary[]
  archived: IterationSummary[]
}

export async function listIterations(): Promise<IterationLists> {
  const root = findAegRoot()
  const activeDir = path.join(root, ITERATIONS_DIR)
  const archivedDir = path.join(activeDir, COMPLETED_DIR)

  const [activeFiles, archivedFiles] = await Promise.all([
    listIterationFiles(activeDir),
    listIterationFiles(archivedDir)
  ])

  const activeLoaded = await Promise.all(activeFiles.map((f) => readOne(activeDir, f)))
  const archivedLoaded = await Promise.all(archivedFiles.map((f) => readOne(archivedDir, f)))

  return {
    active: await Promise.all(activeLoaded.map(({ fileSlug, iteration }) => toSummary(fileSlug, iteration, false))),
    archived: await Promise.all(archivedLoaded.map(({ fileSlug, iteration }) => toSummary(fileSlug, iteration, true)))
  }
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
    projects: Array.from(seen)
  }

  // Archived iterations are complete by definition — skip GitHub entirely.
  if (archived) {
    return { ...base, taskCounts: { total, done: total, ongoing: 0, todo: 0, forgeAvailable: true } }
  }

  // Active: only query GitHub when at least one task has an issue number.
  const hasIssues = iteration.tasks.some((t) => t.issue !== null)
  if (!hasIssues) {
    return { ...base, taskCounts: { total, done: 0, ongoing: 0, todo: total, forgeAvailable: false } }
  }

  const snapshot = await loadIterationSnapshot(iteration, fileSlug)
  let done = 0
  let ongoing = 0
  let todo = 0
  for (const { status } of snapshot.derived.tasks) {
    if (status === 'merged') done++
    else if (status === 'in-flight' || status === 'in-review' || status === 'changes-requested') ongoing++
    else todo++
  }

  return {
    ...base,
    taskCounts: { total, done, ongoing, todo, forgeAvailable: !snapshot.unavailable }
  }
}

export type IterationDetail = {
  fileSlug: string
  archived: boolean
  iteration: Iteration
}

export async function readIteration(fileSlug: string): Promise<IterationDetail | undefined> {
  const root = findAegRoot()
  const activeDir = path.join(root, ITERATIONS_DIR)
  const archivedDir = path.join(activeDir, COMPLETED_DIR)

  const activePath = path.join(activeDir, `${fileSlug}.md`)
  if (existsSync(activePath)) {
    const raw = await fs.readFile(activePath, 'utf8')
    return { fileSlug, archived: false, iteration: parseIteration(raw) }
  }
  const archivedPath = path.join(archivedDir, `${fileSlug}.md`)
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
  const activeDir = path.join(root, ITERATIONS_DIR)
  const archivedDir = path.join(activeDir, COMPLETED_DIR)

  const [activeFiles, archivedFiles] = await Promise.all([
    listIterationFiles(activeDir),
    listIterationFiles(archivedDir)
  ])

  const filterAndSummarize = async (dir: string, files: string[], archived: boolean) => {
    const loaded = await Promise.all(files.map((f) => readOne(dir, f)))
    const filtered = loaded.filter(({ iteration }) => iteration.tasks.some((t) => t.projects.includes(projectName)))
    return Promise.all(filtered.map(({ fileSlug, iteration }) => toSummary(fileSlug, iteration, archived)))
  }

  const [active, archived] = await Promise.all([
    filterAndSummarize(activeDir, activeFiles, false),
    filterAndSummarize(archivedDir, archivedFiles, true)
  ])
  return { active, archived }
}
