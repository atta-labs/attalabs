import type { Task, TaskIssueRef } from '@atta/aeg-types'
import { type GhIssue, ghIssueListByLabel } from './gh'
import { parseRationaleDeps } from './parse-rationale-deps'

/** Issue title convention: `[<iteration-slug>] <task-id> — <title>`, the same
 * shape every AEG Issue is opened with (`open-issue.ts`, brief-authoring). */
export const TITLE_PATTERN = /^\[([^\]]+)]\s*(\S+)\s*—\s*(.+)$/

function parseProjectLabels(labels: Array<{ name: string }>): string[] {
  return labels.filter((l) => l.name.startsWith('project:')).map((l) => l.name.slice('project:'.length))
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
    projects: parseProjectLabels(issue.labels),
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

/** Lists `iteration:<slug>`-labeled Issues and builds the `Task[]` for that
 * iteration. Issue title's bracketed slug is not re-validated against
 * `slug` — the `iteration:<slug>` label is the authoritative membership
 * signal; a title typo should not silently drop a real task. */
export function listTasksForSlug(owner: string, repo: string, slug: string): Task[] {
  const issues = ghIssueListByLabel(owner, repo, `iteration:${slug}`)
  const tasks: Task[] = []
  for (const issue of issues) {
    const task = taskFromIssue(issue)
    if (task) tasks.push(task)
  }
  return tasks.sort((a, b) => compareTaskIds(a.id, b.id))
}

/**
 * Resolves an arbitrary Issue's title + labels to its AEG task identity, if
 * it has one — the REVERSE of `taskFromIssue`/`listTasksForSlug` (those start
 * from a known iteration slug and list its tasks; this starts from an
 * unknown Issue and asks "is this a task Issue, and if so which task?").
 *
 * Same authoritative-signal discipline as `listTasksForSlug`'s doc comment:
 * the `iteration:<slug>` label — not the title's bracketed text — is the
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
  const iterSlug = labels.find((l) => l.startsWith('iteration:'))?.slice('iteration:'.length)
  if (!iterSlug) return null
  return { iterSlug, taskId }
}
