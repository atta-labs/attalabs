export type StageId = 'plan' | 'brief' | 'develop' | 'review' | 'security' | 'archive' | 'wrap-up'

export type Stage = {
  id: StageId
  label: string
  /** The role slug in `aeg-root/roles/<role>.md` — also this stage's
   * `producer` in `contractFile`'s frontmatter, when it has one. */
  role: string
  /** What this stage receives, in the reader's words — from the §2 table in
   * `aeg-root/contracts/*.md`, never invented. */
  receives: string
  /** What this stage produces and hands to the next stage. */
  produces: string
  /** File name in `aeg-root/contracts/` whose frontmatter names this stage's
   * outgoing carrier — what physically crosses from this stage to the next.
   * `null` for Security: it has no contract because it does not sit in the
   * chain — it runs alongside Review, on the same pull request. */
  contractFile: string | null
}

export const STAGES: readonly Stage[] = [
  {
    id: 'plan',
    label: 'Plan',
    role: 'planner',
    receives: 'an intent',
    produces: 'a tranche — milestone + labeled Issues',
    contractFile: 'planner-brief.md'
  },
  {
    id: 'brief',
    label: 'Brief',
    role: 'brief-author',
    receives: "one task's Issue",
    produces: 'a brief',
    contractFile: 'brief-developer.md'
  },
  {
    id: 'develop',
    label: 'Develop',
    role: 'developer',
    receives: 'a brief',
    produces: 'a pull request carrying the brief and the code',
    contractFile: 'developer-reviewer.md'
  },
  {
    id: 'review',
    label: 'Review',
    role: 'reviewer',
    receives: 'the pull request',
    produces: 'a verdict comment',
    contractFile: 'reviewer-archivist.md'
  },
  {
    id: 'security',
    label: 'Security',
    role: 'security',
    receives: 'the same pull request',
    produces: 'a second verdict',
    contractFile: null
  },
  {
    id: 'archive',
    label: 'Archive',
    role: 'archivist',
    receives: 'a merged pull request',
    produces: 'provenance record; Issue closed',
    contractFile: 'archivist-tranche-archivist.md'
  },
  {
    id: 'wrap-up',
    label: 'Wrap up',
    role: 'tranche-archivist',
    receives: 'a finished tranche',
    produces: 'retrospective; milestone closed',
    contractFile: 'tranche-archivist-planner.md'
  }
]

export function stageById(id: StageId): Stage {
  const stage = STAGES.find((candidate) => candidate.id === id)
  if (!stage) {
    throw new Error(`No stage registered for id "${id}"`)
  }
  return stage
}
