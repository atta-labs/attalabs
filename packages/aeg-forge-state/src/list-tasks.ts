import type { Task, TaskIssueRef } from '@atta/aeg-types'
import { type GhIssue, ghIssueListByLabel, ghIssueListByLabelAsync } from './gh'
import { findIterationSlug, iterationLabel } from './labels'
import { parseRationaleDeps } from './parse-rationale-deps'

/** Issue title convention: `[<iteration-slug>] <task-id> — <title>`, the same
 * shape every Vinaya Issue is opened with (`open-issue.ts`, brief-authoring). */
export const TITLE_PATTERN = /^\[([^\]]+)]\s*(\S+)\s*—\s*(.+)$/

/** Reads the `**Project:**` field from a task Issue's rationale body (the D-078
 * grammar). Project is a **field, not a label** (doctrine): `state-machine-v1`
 * task 2 / #614 dropped the `project:*` labels outright, so the field is the
 * only source. It also resolves a forge-native task Issue that carries only the
 * field and never got a label (the `state-machine-v1` dead-board case). Matches
 * the bold field line only; the prose `**Project(s) + blast radius**` heading
 * and a backticked inline `Project: x` never match (no `:**` right after).
 *
 * Values are shape-guarded, not registry-checked: the field is free prose and
 * authors write real sentences in it (#554: `**Project:** (none — tools/admin
 * is unregistered; …)`), which without a guard becomes a "project" that builds
 * a 404 board link — strictly worse than the board-less row it replaces. The
 * guard stays a slug shape rather than a registry lookup on purpose: this
 * package is pure, repo-parameterized forge derivation and must not couple to
 * `packages/governance`. An unregistered-but-slug-shaped value still resolves
 * here; that is the registry's problem to report, not this parser's. */
const PROJECT_SLUG = /^[a-z0-9][a-z0-9-]*$/i

export function projectsFromBody(body: string): string[] {
  const m = body.match(/^\s*\*\*Project(?:\(s\))?:\*\*\s*(.+)$/im)
  if (!m) return []
  return (m[1] ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => PROJECT_SLUG.test(s))
}

function taskFromIssue(issue: GhIssue): Task | null {
  const m = issue.title.match(TITLE_PATTERN)
  if (!m) return null
  const id = (m[2] ?? '').trim()
  const title = (m[3] ?? '').trim()
  if (!id || !title) return null
  const body = issue.body ?? ''
  const { dependsOn, conflictsWith } = parseRationaleDeps(body)
  return {
    id,
    title,
    issue: issue.number,
    projects: projectsFromBody(body),
    dependsOn,
    conflictsWith,
    rationaleMarkdown: body
  }
}

/** Numeric-then-alpha ordering so suffixed ids (`7a`, `7b`) sort right after
 * their base id, matching the topology table's natural row order. */
function compareTaskIds(a: string, b: string): number {
  const numA = a.match(/^(\d+)(.*)$/)
  const numB = b.match(/^(\d+)(.*)$/)
  if (numA && numB) {
    const diff = Number(numA[1]) - Number(numB[1])
    if (diff !== 0) return diff
    return (numA[2] ?? '').localeCompare(numB[2] ?? '')
  }
  return a.localeCompare(b)
}

/** Shared `GhIssue[] → Task[]` transform (`taskFromIssue` map + `compareTaskIds`
 * sort), the single source both the sync and async list functions call so the
 * two can never derive a different task list. */
function tasksFromIssues(issues: GhIssue[]): Task[] {
  const tasks: Task[] = []
  for (const issue of issues) {
    const task = taskFromIssue(issue)
    if (task) tasks.push(task)
  }
  return tasks.sort((a, b) => compareTaskIds(a.id, b.id))
}

/** Lists `vinaya/iteration:<slug>`-labeled Issues and builds the `Task[]` for
 * that iteration. Issue title's bracketed slug is not re-validated against
 * `slug` — the `vinaya/iteration:<slug>` label is the authoritative membership
 * signal; a title typo should not silently drop a real task. */
export function listTasksForSlug(owner: string, repo: string, slug: string): Task[] {
  return tasksFromIssues(ghIssueListByLabel(owner, repo, iterationLabel(slug)))
}

/** Async twin of `listTasksForSlug` — non-blocking `gh` exec, same transform. */
export async function listTasksForSlugAsync(owner: string, repo: string, slug: string): Promise<Task[]> {
  return tasksFromIssues(await ghIssueListByLabelAsync(owner, repo, iterationLabel(slug)))
}

/**
 * Resolves an arbitrary Issue's title + labels to its Vinaya task identity, if
 * it has one — the REVERSE of `taskFromIssue`/`listTasksForSlug` (those start
 * from a known iteration slug and list its tasks; this starts from an
 * unknown Issue and asks "is this a task Issue, and if so which task?").
 *
 * Same authoritative-signal discipline as `listTasksForSlug`'s doc comment:
 * the `vinaya/iteration:<slug>` label — not the title's bracketed text — is the
 * slug source. The title only needs to match the `[<slug>] <id> — ...`
 * shape closely enough to yield a task id; a bracket/label slug mismatch
 * (title typo) doesn't invalidate the label's membership signal.
 *
 * Used by `checkClosesN`'s reverse-direction check (D-069 Layer 1 reverse,
 * `@atta/aeg-core`'s `coherence-checks.ts`).
 */
export function resolveTaskIssueRef(title: string, labels: string[]): TaskIssueRef | null {
  const m = title.match(TITLE_PATTERN)
  if (!m) return null
  const taskId = (m[2] ?? '').trim()
  if (!taskId) return null
  const iterSlug = findIterationSlug(labels)
  if (!iterSlug) return null
  return { iterSlug, taskId }
}
