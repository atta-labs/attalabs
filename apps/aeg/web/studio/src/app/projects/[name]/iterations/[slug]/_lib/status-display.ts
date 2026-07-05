/**
 * Visual mapping for derived statuses. The status set itself is owned by
 * `@atta/aeg-core`'s `DerivedStatus` — this module only assigns labels and
 * semantic-token classes. **No tokens are re-derived here**; everything reads
 * the status `deriveIteration` produced.
 *
 * Column order is editorial — left-to-right walks the task through its
 * lifecycle (todo → done). `dropped`/`incoherent` follow `merged` as the two
 * honest-terminal anomaly states (D-069): a closed Issue that never had a
 * merged PR. `blocked` stays at the end as the holding pen for tasks lifted
 * out of normal flow. `backlog` is project-level only (D-059) and never
 * appears on the iteration board.
 *
 * Sharing between the kanban board, the task-detail badge, and any future
 * surface is deliberate so the colour vocabulary stays consistent.
 *
 * `todo` additionally has two display-only sub-states (#372 bundled finding):
 * **Ready** / **Blocked · needs #N**, rendered by `todoDispatchVisual` from
 * `checkDispatchReadiness`'s verdict (`@atta/aeg-core`, the same function
 * `verify-dispatch.ts` calls) — never a re-derivation, and unrelated to the
 * `blocked` DerivedStatus above (D-069's anomaly holding-pen). Blocking refs
 * are extracted verbatim from the gate's own `blockers` strings.
 */

import type { DerivedStatus, DispatchResult } from '@atta/aeg-core'

export const STATUS_ORDER: DerivedStatus[] = [
  'todo',
  'in-flight',
  'in-review',
  'changes-requested',
  'merged',
  'dropped',
  'incoherent',
  'blocked'
]

type StatusVisual = {
  label: string
  /** Tailwind classes for the badge — semantic tokens only. */
  badgeClass: string
  /** Tailwind classes for the column header / accent stripe. */
  accentClass: string
  /** One-line description for empty-state tooltips and the detail view. */
  description: string
}

const STATUS_VISUALS: Record<DerivedStatus, StatusVisual> = {
  backlog: {
    label: 'Backlog',
    badgeClass: 'bg-muted/40 text-muted-foreground border-border',
    accentClass: 'border-border',
    description: 'Not dispatched yet.'
  },
  todo: {
    label: 'Todo',
    badgeClass: 'bg-muted/40 text-foreground border-border',
    accentClass: 'border-border',
    description: 'Assigned, awaiting branch.'
  },
  'in-flight': {
    label: 'In-flight',
    badgeClass: 'bg-primary/15 text-primary border-primary/50',
    accentClass: 'border-primary/50',
    description: 'Branch open, no PR yet.'
  },
  'in-review': {
    label: 'In review',
    badgeClass: 'bg-primary/25 text-primary border-primary/70',
    accentClass: 'border-primary/70',
    description: 'PR open, awaiting review.'
  },
  'changes-requested': {
    label: 'Changes requested',
    badgeClass: 'bg-warning/10 text-warning border-warning/40',
    accentClass: 'border-warning/40',
    description: 'Reviewer asked for changes.'
  },
  merged: {
    label: 'Merged',
    badgeClass: 'bg-success/10 text-success border-success/40',
    accentClass: 'border-success/40',
    description: 'PR merged.'
  },
  dropped: {
    label: 'Dropped',
    badgeClass: 'bg-muted/40 text-muted-foreground border-border',
    accentClass: 'border-border',
    description: 'Issue closed NOT_PLANNED — legitimately abandoned. No action needed.'
  },
  incoherent: {
    label: 'Incoherent',
    badgeClass: 'bg-destructive/10 text-destructive border-destructive/40',
    accentClass: 'border-destructive/40',
    description: 'Closed COMPLETED but no merged PR — governance signal broken. Needs human investigation.'
  },
  blocked: {
    label: 'Blocked',
    badgeClass: 'bg-destructive/10 text-destructive border-destructive/40',
    accentClass: 'border-destructive/40',
    description: '`aeg:blocked` label set on the Issue.'
  }
}

export function statusVisual(status: DerivedStatus): StatusVisual {
  return STATUS_VISUALS[status]
}

export type TodoDispatchVisual = {
  label: string
  /** Tailwind classes for the badge — semantic tokens only. */
  badgeClass: string
  /** Full blocker lines from `checkDispatchReadiness`, surfaced via the badge's hover title. */
  title: string
}

/**
 * Unique `#N` refs in blocker order — drawn verbatim from the gate's own
 * blocker strings, never re-derived from topology or forge state.
 */
export function extractBlockerRefs(blockers: string[]): string[] {
  const seen = new Set<string>()
  for (const blocker of blockers) {
    for (const m of blocker.matchAll(/#\d+/g)) seen.add(m[0])
  }
  return [...seen]
}

/**
 * Visual for the `todo` badge's dispatch-readiness sub-state. Ready and
 * Blocked are deliberately distinct from the `blocked` DerivedStatus visual
 * (destructive) — this is a waiting state, not an anomaly.
 */
export function todoDispatchVisual(result: DispatchResult): TodoDispatchVisual {
  if (result.ready) {
    return {
      label: 'Ready',
      badgeClass: 'bg-success/10 text-success border-success/40',
      title: 'Dispatch gate passes — dispatchable right now.'
    }
  }
  const refs = extractBlockerRefs(result.blockers)
  return {
    label: refs.length > 0 ? `Blocked · needs ${refs.join(' ')}` : 'Blocked',
    badgeClass: 'bg-warning/10 text-warning border-warning/40',
    title: result.blockers.join('\n')
  }
}
