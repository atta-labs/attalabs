import { ghIssueListByLabel } from './gh'
import { iterationLabel } from './labels'

export type IssueMilestoneFact = { issue: number; milestoneTitle: string | null }

/**
 * For OPEN Issues carrying `vinaya/iteration:<slug>`, each Issue's GitHub-native
 * milestone title (or `null` when unattached). Reuses `ghIssueListByLabel` —
 * the same fetch `listTasksForSlug` already runs — rather than a second
 * query (aeg-review-gate-v1 task 1 follow-up: the L4 coherence check).
 */
export function listIssueMilestonesForSlug(owner: string, repo: string, slug: string): IssueMilestoneFact[] {
  return ghIssueListByLabel(owner, repo, iterationLabel(slug))
    .filter((i) => i.state === 'OPEN')
    .map((i) => ({ issue: i.number, milestoneTitle: i.milestone?.title ?? null }))
}
