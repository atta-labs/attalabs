/**
 * Visual mapping for derived statuses. The status set itself is owned by
 * `@atta/aeg-core`'s `DerivedStatus` — this module only assigns labels and
 * semantic-token classes. **No tokens are re-derived here**; everything reads
 * the status `deriveIteration` produced.
 *
 * Column order is editorial — left-to-right walks the task through its
 * lifecycle (todo → done), with `blocked` at the end as the holding pen
 * for tasks lifted out of normal flow. `backlog` is project-level only (D-059)
 * and never appears on the iteration board.
 *
 * Sharing between the kanban board, the task-detail badge, and any future
 * surface is deliberate so the colour vocabulary stays consistent.
 *
 * NOTE (T6 / #250 — flagged for Vb / #230): `dropped` and `incoherent` are the
 * two new honest-terminal statuses (D-069). They are added here with **minimal,
 * non-blocking** visuals only so the exhaustive `Record<DerivedStatus, …>`
 * compiles. The deliberate board placement, accent treatment, and the "Check
 * Coherence" surfacing of `incoherent` are Vb's render task — these entries are
 * placeholders, not the final design.
 */

import type { DerivedStatus } from '@atta/aeg-core'

export const STATUS_ORDER: DerivedStatus[] = [
  'todo',
  'in-flight',
  'in-review',
  'changes-requested',
  'merged',
  // Terminal-anomaly statuses (D-069) — placement provisional, refined by Vb.
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
    badgeClass: 'bg-primary/10 text-primary border-primary/40',
    accentClass: 'border-primary/40',
    description: 'Branch open, no PR yet.'
  },
  'in-review': {
    label: 'In review',
    badgeClass: 'bg-primary/10 text-primary border-primary/40',
    accentClass: 'border-primary/40',
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
  // Minimal placeholders (T6 / #250) — final treatment is Vb's (#230).
  dropped: {
    label: 'Dropped',
    badgeClass: 'bg-muted/40 text-muted-foreground border-border',
    accentClass: 'border-border',
    description: 'Issue closed NOT_PLANNED — abandoned, never done.'
  },
  incoherent: {
    label: 'Incoherent',
    badgeClass: 'bg-destructive/10 text-destructive border-destructive/40',
    accentClass: 'border-destructive/40',
    description: 'Closed COMPLETED but no merged-PR link — needs a human.'
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
