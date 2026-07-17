import { Badge } from '@atta/ui/components'

/**
 * The one place the Studio's Issue-label vocabulary is styled (task 11 #571) —
 * shared by the backlog table and the dashboard's Backlog card so both read
 * identically. Colour is keyed to a label's CATEGORY (its prefix), never its
 * value — one flat semantic-token variant per family; the doctrine forbids a
 * per-value palette. `needs:*` reads `warning`; there is no `info`/blue token.
 *
 * Server-safe (no client hooks) so it renders in both server and client trees.
 */

export type LabelKind = 'project' | 'tier' | 'status' | 'needs' | 'other'

const KIND_CLASS: Record<LabelKind, string> = {
  project: 'text-accent border-accent/40',
  tier: 'text-foreground border-border',
  status: 'text-primary border-primary/40',
  needs: 'text-warning border-warning/40',
  other: 'text-muted-foreground border-border'
}

const KIND_RANK: Record<LabelKind, number> = { project: 0, tier: 1, status: 2, needs: 3, other: 4 }

export function labelKind(label: string): LabelKind {
  if (label.startsWith('project:')) return 'project'
  if (label.startsWith('tier:')) return 'tier'
  if (label.startsWith('status:')) return 'status'
  if (label.startsWith('needs:')) return 'needs'
  return 'other'
}

/** Labels ordered by category so the hierarchy reads left-to-right. */
export function rankedLabels(labels: string[]): string[] {
  return [...labels].sort((a, b) => KIND_RANK[labelKind(a)] - KIND_RANK[labelKind(b)])
}

export type SplitLabels = { projects: string[]; tier: string | null; flags: string[] }

/** Partition an Issue's labels into the families the table's columns render. */
export function splitLabels(labels: string[]): SplitLabels {
  return {
    projects: labels.filter((l) => l.startsWith('project:')),
    tier: labels.find((l) => l.startsWith('tier:')) ?? null,
    flags: labels.filter((l) => l.startsWith('needs:') || l.startsWith('status:'))
  }
}

export function LabelBadge({ label }: { label: string }) {
  return (
    <Badge variant='outline' className={`font-mono text-xs ${KIND_CLASS[labelKind(label)]}`}>
      {label}
    </Badge>
  )
}
