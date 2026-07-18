import type { Iteration } from '@atta/aeg-types'
import { findMilestoneForSlug, type MilestoneFacts } from './fetch-milestone'
import { listTasksForSlugAsync } from './list-tasks'

/**
 * Derives an `@atta/aeg-types` `Iteration` purely from forge objects:
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
 *
 * `known` (optional `{ goal, lifecycle }`): when the caller already holds the
 * Milestone facts — e.g. a Studio enumeration that listed every open/closed
 * Milestone up front, so goal comes from the Milestone description and
 * lifecycle from which list the slug came from — passing them skips the
 * redundant per-slug `findMilestoneForSlug` re-fetch (which otherwise re-pulls
 * the entire Milestone list once per slug). Omit it and the Milestone is
 * fetched here as before. The task fetch is now async (`listTasksForSlugAsync`)
 * so the fan-outs that call this genuinely parallelize; the signature is
 * unchanged for existing 3-arg callers (already `async`, already awaited).
 */
export async function deriveIterationFromForge(
  owner: string,
  repo: string,
  slug: string,
  known?: MilestoneFacts
): Promise<Iteration> {
  const milestone = known ?? findMilestoneForSlug(owner, repo, slug)
  const tasks = await listTasksForSlugAsync(owner, repo, slug)

  return {
    name: slug,
    lifecycle: milestone?.lifecycle ?? 'active',
    goal: milestone?.goal ?? '',
    tasks,
    backlog: []
  }
}
