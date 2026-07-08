import { ghApiGet } from './gh'
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
 * Matching rule: exact title match against the iteration slug. A Milestone
 * titled anything other than the slug verbatim (no prefix/suffix convention)
 * is not considered a match. Returns `null` when no Milestone exists yet for
 * this slug — a real, expected transitional state during rollout, not an
 * error (most iterations today have no Milestone).
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

export type ActiveIterationRef = { slug: string; goal: string }

/**
 * Lists every OPEN Milestone as an active-iteration slug — the forge-native
 * enumeration of "which iterations are currently active" (D-110: an
 * iteration's Goal/Lifecycle lives on a Milestone titled exactly its slug).
 * Archived iterations have no Milestone-based enumeration equivalent by
 * design — they are a permanent, file-only concern (their topology files are
 * the historical record; `iterations/README.md`'s birth rule never migrates
 * history), not something this function is meant to surface.
 */
export function listActiveIterationSlugs(owner: string, repo: string): ActiveIterationRef[] {
  const milestones = ghApiGet<GhMilestone[]>(`repos/${owner}/${repo}/milestones?state=open&per_page=100`)
  return milestones.map((m) => ({ slug: m.title, goal: m.description ?? '' }))
}
