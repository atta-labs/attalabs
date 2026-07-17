'use client'

import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@atta/ui/components'
import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { BacklogIssue } from '@/lib/forge/fetch-open-issues'

/**
 * The backlog as a filterable table (task 11 #571 follow-up). Replaces the
 * grouped-cards layout: one row per Issue, so a cross-project Issue (#513,
 * `project:aeg` + `project:aeg-core`) is a single row carrying BOTH project
 * badges instead of being duplicated under two headings — and the project
 * filter matches it under either (D-091: never drop the second project).
 *
 * Filters are project + tier only — the two label families that actually vary
 * across backlog rows. Iteration and state do NOT vary here: the backlog is
 * defined as open Issues carrying NO `iteration:*` label (`fetch-open-issues.ts`),
 * so every row is open and iteration-less. A row matches when it carries ANY
 * selected project (multi-project rows match either) AND its tier is selected;
 * an empty filter set means "all". Filters are inline toggle chips — every
 * option is visible at a glance, and they wrap on narrow screens.
 *
 * The `#` and Title columns are split (like the iteration board's table). The
 * table sets a `min-w` so the library Table's own `overflow-auto` scroll
 * container kicks in on narrow screens instead of cramming the columns.
 *
 * Label styling is keyed to a label's CATEGORY (its prefix), never its value —
 * one flat semantic-token variant per family (the doctrine forbids a per-value
 * palette). `needs:*` reads `warning`; there is no `info`/blue token.
 */

type LabelKind = 'project' | 'tier' | 'status' | 'needs' | 'other'

const KIND_CLASS: Record<LabelKind, string> = {
  project: 'text-accent border-accent/40',
  tier: 'text-foreground border-border',
  status: 'text-primary border-primary/40',
  needs: 'text-warning border-warning/40',
  other: 'text-muted-foreground border-border'
}

function labelKind(label: string): LabelKind {
  if (label.startsWith('project:')) return 'project'
  if (label.startsWith('tier:')) return 'tier'
  if (label.startsWith('status:')) return 'status'
  if (label.startsWith('needs:')) return 'needs'
  return 'other'
}

function LabelBadge({ label }: { label: string }) {
  return (
    <Badge variant='outline' className={`font-mono text-[0.65rem] ${KIND_CLASS[labelKind(label)]}`}>
      {label}
    </Badge>
  )
}

function Dash() {
  return <span className='font-mono text-xs text-muted-foreground/60'>—</span>
}

type SplitLabels = { projects: string[]; tier: string | null; flags: string[] }

function splitLabels(labels: string[]): SplitLabels {
  return {
    projects: labels.filter((l) => l.startsWith('project:')),
    tier: labels.find((l) => l.startsWith('tier:')) ?? null,
    flags: labels.filter((l) => l.startsWith('needs:') || l.startsWith('status:'))
  }
}

/** One toggle chip in a filter row — filled when active, outline when not. */
function FilterChip({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <Button
      type='button'
      variant={active ? 'default' : 'outline'}
      size='sm'
      onClick={onToggle}
      aria-pressed={active}
      className={`h-7 font-mono text-xs ${
        active ? 'border-accent bg-accent text-accent-foreground hover:bg-accent/90' : 'text-muted-foreground'
      }`}
    >
      {label}
    </Button>
  )
}

/** A labelled row of toggle chips over one label family. */
function FilterGroup({
  name,
  options,
  selected,
  onToggle,
  strip = ''
}: {
  name: string
  options: string[]
  selected: Set<string>
  onToggle: (value: string) => void
  /** Prefix to strip for the chip's display text (the full label still filters). */
  strip?: string
}) {
  if (options.length === 0) return null
  return (
    <div className='flex flex-wrap items-center gap-1.5'>
      <span className='font-mono text-[0.7rem] uppercase tracking-wider text-foreground'>{name}</span>
      {options.map((option) => (
        <FilterChip
          key={option}
          label={option.slice(strip.length)}
          active={selected.has(option)}
          onToggle={() => onToggle(option)}
        />
      ))}
    </div>
  )
}

export function BacklogTable({
  issues,
  projectOptions,
  tierOptions,
  flagOptions
}: {
  issues: BacklogIssue[]
  /** Distinct `project:*` labels present, in registry order. */
  projectOptions: string[]
  /** Distinct `tier:*` labels present, low tier first. */
  tierOptions: string[]
  /** Distinct `needs:*`/`status:*` labels present. */
  flagOptions: string[]
}) {
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set())
  const [selectedTiers, setSelectedTiers] = useState<Set<string>>(new Set())
  const [selectedFlags, setSelectedFlags] = useState<Set<string>>(new Set())

  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (value: string) =>
    setter((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })

  const filtered = useMemo(
    () =>
      issues.filter((issue) => {
        const { projects, tier, flags } = splitLabels(issue.labels)
        const projectOk = selectedProjects.size === 0 || projects.some((p) => selectedProjects.has(p))
        const tierOk = selectedTiers.size === 0 || (tier !== null && selectedTiers.has(tier))
        const flagOk = selectedFlags.size === 0 || flags.some((f) => selectedFlags.has(f))
        return projectOk && tierOk && flagOk
      }),
    [issues, selectedProjects, selectedTiers, selectedFlags]
  )

  const anyFilter = selectedProjects.size > 0 || selectedTiers.size > 0 || selectedFlags.size > 0

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
        <FilterGroup
          name='Project'
          options={projectOptions}
          selected={selectedProjects}
          onToggle={toggle(setSelectedProjects)}
          strip='project:'
        />
        <FilterGroup
          name='Tier'
          options={tierOptions}
          selected={selectedTiers}
          onToggle={toggle(setSelectedTiers)}
          strip='tier:'
        />
        <FilterGroup name='Flags' options={flagOptions} selected={selectedFlags} onToggle={toggle(setSelectedFlags)} />
        {anyFilter && (
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='h-7 gap-1 font-mono text-xs text-muted-foreground'
            onClick={() => {
              setSelectedProjects(new Set())
              setSelectedTiers(new Set())
              setSelectedFlags(new Set())
            }}
          >
            <X className='size-3.5' aria-hidden />
            Clear
          </Button>
        )}
        <span className='ml-auto font-mono text-xs text-muted-foreground'>
          {filtered.length} of {issues.length}
        </span>
      </div>

      <div className='rounded-lg border border-border bg-card'>
        <Table className='min-w-[720px] table-fixed'>
          <TableHeader>
            <TableRow>
              <TableHead className='w-16 font-sans text-xs uppercase tracking-wider'>#</TableHead>
              <TableHead className='w-[26%] font-sans text-xs uppercase tracking-wider'>Title</TableHead>
              <TableHead className='w-[20%] font-sans text-xs uppercase tracking-wider'>Project(s)</TableHead>
              <TableHead className='w-24 font-sans text-xs uppercase tracking-wider'>Tier</TableHead>
              <TableHead className='w-[26%] font-sans text-xs uppercase tracking-wider'>Flags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className='py-8 text-center font-sans text-sm text-muted-foreground/70'>
                  No issues match these filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((issue) => {
                const { projects, tier, flags } = splitLabels(issue.labels)
                return (
                  <TableRow key={issue.number}>
                    <TableCell className='align-top'>
                      <a
                        href={issue.url}
                        target='_blank'
                        rel='noreferrer'
                        className='whitespace-nowrap font-mono text-xs text-muted-foreground hover:text-accent hover:underline'
                      >
                        #{issue.number}
                      </a>
                    </TableCell>
                    <TableCell className='align-top'>
                      <a
                        href={issue.url}
                        target='_blank'
                        rel='noreferrer'
                        className='block break-words font-sans text-sm text-card-foreground hover:text-accent hover:underline'
                      >
                        {issue.title}
                      </a>
                    </TableCell>
                    <TableCell className='align-top'>
                      <div className='flex flex-wrap gap-1'>
                        {projects.length > 0 ? (
                          projects.map((label) => <LabelBadge key={label} label={label} />)
                        ) : (
                          <Dash />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className='align-top'>
                      <div className='flex flex-wrap gap-1'>{tier ? <LabelBadge label={tier} /> : <Dash />}</div>
                    </TableCell>
                    <TableCell className='align-top'>
                      <div className='flex flex-wrap gap-1'>
                        {flags.length > 0 ? flags.map((label) => <LabelBadge key={label} label={label} />) : <Dash />}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
