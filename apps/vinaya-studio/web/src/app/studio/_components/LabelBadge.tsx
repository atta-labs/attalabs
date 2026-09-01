import { LABEL_NAMESPACE, LABELS, matchesLabel } from '@attalabs/aeg-forge-state/labels'
import { Badge } from '@atta/ui/components'

/**
 * The one place the Studio's Issue-label vocabulary is styled (task 11 #571) —
 * shared by the backlog table and the dashboard's Backlog card so both read
 * identically. Colour is keyed to a label's CATEGORY, never its value — one
 * flat semantic-token variant per family; the doctrine forbids a per-value
 * palette. `needs:*` reads `warning`; there is no `info`/blue token.
 *
 * The category comes from the code-owned vocabulary (`@attalabs/aeg-forge-state`'s
 * `labels.ts`), not from a prefix written here — that is what keeps this
 * component correct across a namespace rename (#614). `project` is NOT a label
 * kind: project is a body field, so the backlog renders project names from the
 * Issue's `**Project:**` field rather than from any label.
 *
 * Server-safe (no client hooks) so it renders in both server and client trees —
 * and it is reached from a `'use client'` module (`BacklogTable.tsx`), which is
 * why the vocabulary comes from the pure `@attalabs/aeg-forge-state/labels` SUBPATH
 * and never the package barrel: the barrel re-exports `gh.ts`'s
 * `node:child_process`, which Turbopack cannot bundle for the browser.
 */

export type LabelKind = 'project' | 'tier' | 'type' | 'state' | 'needs' | 'flag' | 'other'

const KIND_CLASS: Record<LabelKind, string> = {
  project: 'text-primary border-primary/40',
  tier: 'text-foreground border-border',
  // Classification metadata, not a status signal — the commit-type shape of
  // the work, same axis as `tier` (what the Issue IS) rather than the
  // state/flag/needs family (what needs attention). `primary` is already
  // spoken for by `project`/`state`; `muted-foreground` is the doctrine's own
  // "informational without weight" choice.
  type: 'text-muted-foreground border-border',
  state: 'text-primary border-primary/40',
  needs: 'text-warning border-warning/40',
  // A detected anomaly awaiting a human — the one family that reads as wrong,
  // not merely as pending.
  flag: 'text-destructive border-destructive/40',
  other: 'text-muted-foreground border-border'
}

const KIND_RANK: Record<LabelKind, number> = { project: 0, tier: 1, type: 2, state: 3, flag: 4, needs: 5, other: 6 }

export function labelKind(label: string): LabelKind {
  const entry = LABELS.find((l) => matchesLabel(l.key, label))
  if (!entry) return 'other'
  if (entry.category === 'tier') return 'tier'
  if (entry.category === 'type') return 'type'
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

export type SplitLabels = { tier: string | null; type: string | null; flags: string[] }

/**
 * Partition an Issue's labels into the families the table's columns render.
 * Projects are absent by construction — they come from the Issue body, not
 * from labels (#614).
 */
export function splitLabels(labels: string[]): SplitLabels {
  return {
    tier: labels.find((l) => labelKind(l) === 'tier') ?? null,
    type: labels.find((l) => labelKind(l) === 'type') ?? null,
    flags: labels.filter((l) => {
      const kind = labelKind(l)
      return kind === 'needs' || kind === 'state' || kind === 'flag'
    })
  }
}

/**
 * The label as a reader should see it — the `vinaya/` product prefix dropped.
 * Every label in this repo carries it, so rendering it is pure noise; #614
 * added the namespace for the forge's benefit (one filterable group in a repo
 * shared with an adopter's own labels), not the reader's.
 *
 * DISPLAY ONLY. `labelKind`, `splitLabels`, `matchesLabel` and every filter
 * key off the FULL label — strip before any of those and the badge loses its
 * category colour, because `matchesLabel` would no longer match `LABELS`.
 * Derived from `LABEL_NAMESPACE` rather than a hardcoded regex so it tracks
 * the vocabulary.
 */
export function displayLabel(label: string): string {
  return label.startsWith(LABEL_NAMESPACE) ? label.slice(LABEL_NAMESPACE.length) : label
}

export function LabelBadge({ label }: { label: string }) {
  // `labelKind` gets the full label; only the rendered text is stripped.
  return (
    <Badge variant='outline' className={`font-mono text-xs ${KIND_CLASS[labelKind(label)]}`}>
      {displayLabel(label)}
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
