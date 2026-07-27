import { ghApiGet, ghApiGetAsync } from './gh'
import type { Lifecycle } from '@atta/aeg-types'

export type MilestoneFacts = {
  goal: string
  lifecycle: Lifecycle
}

type GhMilestone = {
  title: string
  description: string | null
  state: 'open' | 'closed'
}

/**
 * Matching rule: exact title match against the tranche slug. A Milestone
 * titled anything other than the slug verbatim (no prefix/suffix convention)
 * is not considered a match. Returns `null` when no Milestone exists yet for
 * this slug — a real, expected transitional state during rollout, not an
 * error (most tranches today have no Milestone).
 */
export function findMilestoneForSlug(owner: string, repo: string, slug: string): MilestoneFacts | null {
  const milestones = ghApiGet<GhMilestone[]>(`repos/${owner}/${repo}/milestones?state=all&per_page=100`)
  const match = milestones.find((m) => m.title === slug)
  if (!match) return null
  return {
    goal: match.description ?? '',
    lifecycle: match.state === 'closed' ? 'complete' : 'active'
  }
}

export type ActiveTrancheRef = { slug: string; goal: string }

/**
 * Lists every OPEN Milestone as an active-tranche slug — the forge-native
 * enumeration of "which tranches are currently active" — an
 * tranche's Goal/Lifecycle lives on a Milestone titled exactly its slug.
 */
export function listActiveTrancheSlugs(owner: string, repo: string): ActiveTrancheRef[] {
  const milestones = ghApiGet<GhMilestone[]>(`repos/${owner}/${repo}/milestones?state=open&per_page=100`)
  return milestones.map((m) => ({ slug: m.title, goal: m.description ?? '' }))
}

/**
 * Lists every CLOSED Milestone as an archived-tranche slug — the
 * forge-native enumeration of "which tranches are complete" (#515).
 * Mirrors `listActiveTrancheSlugs`'s shape and query, `state=closed`
 * instead of `open`. `deriveTrancheFromForge`'s Issue lookup already queries
 * `--state all` (`gh.ts`'s `ghIssueListByLabel`), so a closed Milestone's
 * `vinaya/tranche:<slug>`-labeled Issues (themselves closed, merged PRs) resolve
 * correctly through the same task-list derivation active tranches use.
 */
export function listArchivedTrancheSlugs(owner: string, repo: string): ActiveTrancheRef[] {
  const milestones = ghApiGet<GhMilestone[]>(`repos/${owner}/${repo}/milestones?state=closed&per_page=100`)
  return milestones.map((m) => ({ slug: m.title, goal: m.description ?? '' }))
}

/** Async twin of `listActiveTrancheSlugs` — non-blocking `gh` exec, same map. */
export async function listActiveTrancheSlugsAsync(owner: string, repo: string): Promise<ActiveTrancheRef[]> {
  const milestones = await ghApiGetAsync<GhMilestone[]>(`repos/${owner}/${repo}/milestones?state=open&per_page=100`)
  return milestones.map((m) => ({ slug: m.title, goal: m.description ?? '' }))
}

/** Async twin of `listArchivedTrancheSlugs` — non-blocking `gh` exec, same map. */
export async function listArchivedTrancheSlugsAsync(owner: string, repo: string): Promise<ActiveTrancheRef[]> {
  const milestones = await ghApiGetAsync<GhMilestone[]>(`repos/${owner}/${repo}/milestones?state=closed&per_page=100`)
  return milestones.map((m) => ({ slug: m.title, goal: m.description ?? '' }))
}
