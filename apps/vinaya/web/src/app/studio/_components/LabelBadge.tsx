import { LABELS, matchesLabel } from '@atta/aeg-forge-state/labels'
import { Badge } from '@atta/ui/components'

/**
 * The one place the Studio's Issue-label vocabulary is styled (task 11 #571) —
 * shared by the backlog table and the dashboard's Backlog card so both read
 * identically. Colour is keyed to a label's CATEGORY, never its value — one
 * flat semantic-token variant per family; the doctrine forbids a per-value
 * palette. `needs:*` reads `warning`; there is no `info`/blue token.
 *
 * The category comes from the code-owned vocabulary (`@atta/aeg-forge-state`'s
 * `labels.ts`), not from a prefix written here — that is what keeps this
 * component correct across a namespace rename (#614). `project` is NOT a label
 * kind: project is a body field, so the backlog renders project names from the
 * Issue's `**Project:**` field rather than from any label.
 *
 * Server-safe (no client hooks) so it renders in both server and client trees —
 * and it is reached from a `'use client'` module (`BacklogTable.tsx`), which is
 * why the vocabulary comes from the pure `@atta/aeg-forge-state/labels` SUBPATH
 * and never the package barrel: the barrel re-exports `gh.ts`'s
 * `node:child_process`, which Turbopack cannot bundle for the browser.
 */

export type LabelKind = 'project' | 'tier' | 'state' | 'needs' | 'flag' | 'other'

const KIND_CLASS: Record<LabelKind, string> = {
  project: 'text-primary border-primary/40',
  tier: 'text-foreground border-border',
  state: 'text-primary border-primary/40',
  needs: 'text-warning border-warning/40',
  // A detected anomaly awaiting a human — the one family that reads as wrong,
  // not merely as pending.
  flag: 'text-destructive border-destructive/40',
  other: 'text-muted-foreground border-border'
}

const KIND_RANK: Record<LabelKind, number> = { project: 0, tier: 1, state: 2, flag: 3, needs: 4, other: 5 }

export function labelKind(label: string): LabelKind {
  const entry = LABELS.find((l) => matchesLabel(l.key, label))
  if (!entry) return 'other'
  if (entry.category === 'tier') return 'tier'
  if (entry.category === 'state') return 'state'
  if (entry.category === 'needs') return 'needs'
  if (entry.category === 'flag') return 'flag'
  // `kind` (a storage object) never reaches a work-shaped view — the backlog
  // fetch filters it out — so it needs no styling of its own.
  return 'other'
}

/** Labels ordered by category so the hierarchy reads left-to-right. */
export function rankedLabels(labels: string[]): string[] {
  return [...labels].sort((a, b) => KIND_RANK[labelKind(a)] - KIND_RANK[labelKind(b)])
}

export type SplitLabels = { tier: string | null; flags: string[] }

/**
 * Partition an Issue's labels into the families the table's columns render.
 * Projects are absent by construction — they come from the Issue body, not
 * from labels (#614).
 */
export function splitLabels(labels: string[]): SplitLabels {
  return {
    tier: labels.find((l) => labelKind(l) === 'tier') ?? null,
    flags: labels.filter((l) => {
      const kind = labelKind(l)
      return kind === 'needs' || kind === 'state' || kind === 'flag'
    })
  }
}

export function LabelBadge({ label }: { label: string }) {
  return (
    <Badge variant='outline' className={`font-mono text-xs ${KIND_CLASS[labelKind(label)]}`}>
      {label}
    </Badge>
  )
}

/** A project name rendered in the same visual family as a label badge. */
export function ProjectBadge({ project }: { project: string }) {
  return (
    <Badge variant='outline' className={`font-mono text-xs ${KIND_CLASS.project}`}>
      {project}
    </Badge>
  )
}
