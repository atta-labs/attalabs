import type { Iteration } from '@atta/aeg-core'
import { findMilestoneForSlug } from './fetch-milestone'
import { listTasksForSlug } from './list-tasks'

/**
 * Derives an `@atta/aeg-core` `Iteration` purely from forge objects:
 *   - a Milestone titled exactly `slug` → `goal` + `lifecycle` (absent when no
 *     Milestone exists yet for this iteration — a real transitional state,
 *     not an error; `goal`/`lifecycle` then degrade to `''`/`'active'`,
 *     mirroring `parseIteration`'s own no-marker default)
 *   - `iteration:<slug>`-labeled Issues → the task list, including
 *     `Depends-on`/`Conflicts-with` edges parsed from each Issue's
 *     "Dependency rationale" section
 *
 * `backlog` has no forge equivalent yet (the file's `## Backlog` section is
 * project-level prose with no owning Issue) — always `[]` here.
 */
export async function deriveIterationFromForge(owner: string, repo: string, slug: string): Promise<Iteration> {
  const milestone = findMilestoneForSlug(owner, repo, slug)
  const tasks = listTasksForSlug(owner, repo, slug)

  return {
    name: slug,
    lifecycle: milestone?.lifecycle ?? 'active',
    goal: milestone?.goal ?? '',
    tasks,
    backlog: []
  }
}
