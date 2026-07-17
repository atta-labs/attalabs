'use client'

import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@atta/ui/components'
import { ChevronDown, ListFilter, X } from 'lucide-react'
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
 * an empty filter set means "all".
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

type SplitLabels = { projects: string[]; tier: string | null; flags: string[] }

function splitLabels(labels: string[]): SplitLabels {
  return {
    projects: labels.filter((l) => l.startsWith('project:')),
    tier: labels.find((l) => l.startsWith('tier:')) ?? null,
    flags: labels.filter((l) => l.startsWith('needs:') || l.startsWith('status:'))
  }
}

/** A multi-select checkbox dropdown over one label family. */
function FilterMenu({
  name,
  options,
  selected,
  onToggle
}: {
  name: string
  options: string[]
  selected: Set<string>
  onToggle: (value: string) => void
}) {
  if (options.length === 0) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' size='sm' className='gap-1.5 font-mono text-xs'>
          <ListFilter className='size-3.5' aria-hidden />
          {name}
          {selected.size > 0 && <span className='rounded bg-accent/15 px-1 text-accent'>{selected.size}</span>}
          <ChevronDown className='size-3.5 text-muted-foreground' aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start' className='min-w-44'>
        <DropdownMenuLabel className='font-mono text-xs'>{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option}
            checked={selected.has(option)}
            onCheckedChange={() => onToggle(option)}
            onSelect={(event) => event.preventDefault()}
            className='font-mono text-xs'
          >
            {option}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function BacklogTable({
  issues,
  projectOptions,
  tierOptions
}: {
  issues: BacklogIssue[]
  /** Distinct `project:*` labels present, in registry order. */
  projectOptions: string[]
  /** Distinct `tier:*` labels present, low tier first. */
  tierOptions: string[]
}) {
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set())
  const [selectedTiers, setSelectedTiers] = useState<Set<string>>(new Set())

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
        const { projects, tier } = splitLabels(issue.labels)
        const projectOk = selectedProjects.size === 0 || projects.some((p) => selectedProjects.has(p))
        const tierOk = selectedTiers.size === 0 || (tier !== null && selectedTiers.has(tier))
        return projectOk && tierOk
      }),
    [issues, selectedProjects, selectedTiers]
  )

  const anyFilter = selectedProjects.size > 0 || selectedTiers.size > 0

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap items-center gap-2'>
        <FilterMenu
          name='Project'
          options={projectOptions}
          selected={selectedProjects}
          onToggle={toggle(setSelectedProjects)}
        />
        <FilterMenu name='Tier' options={tierOptions} selected={selectedTiers} onToggle={toggle(setSelectedTiers)} />
        {anyFilter && (
          <Button
            variant='ghost'
            size='sm'
            className='gap-1 font-mono text-xs text-muted-foreground'
            onClick={() => {
              setSelectedProjects(new Set())
              setSelectedTiers(new Set())
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
        <Table className='table-fixed'>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[46%] font-sans text-xs uppercase tracking-wider'>Issue</TableHead>
              <TableHead className='w-[24%] font-sans text-xs uppercase tracking-wider'>Project(s)</TableHead>
              <TableHead className='w-[10%] font-sans text-xs uppercase tracking-wider'>Tier</TableHead>
              <TableHead className='w-[20%] font-sans text-xs uppercase tracking-wider'>Flags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className='py-8 text-center font-sans text-sm text-muted-foreground/70'>
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
                        className='hover:text-accent hover:underline'
                      >
                        <span className='font-mono text-xs text-muted-foreground'>#{issue.number}</span>{' '}
                        <span className='font-sans text-sm text-card-foreground'>{issue.title}</span>
                      </a>
                    </TableCell>
                    <TableCell className='align-top'>
                      <div className='flex flex-wrap gap-1'>
                        {projects.length > 0 ? (
                          projects.map((label) => <LabelBadge key={label} label={label} />)
                        ) : (
                          <span className='font-mono text-xs text-muted-foreground/60'>—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className='align-top'>
                      {tier ? (
                        <LabelBadge label={tier} />
                      ) : (
                        <span className='font-mono text-xs text-muted-foreground/60'>—</span>
                      )}
                    </TableCell>
                    <TableCell className='align-top'>
                      <div className='flex flex-wrap gap-1'>
                        {flags.length > 0 ? (
                          flags.map((label) => <LabelBadge key={label} label={label} />)
                        ) : (
                          <span className='font-mono text-xs text-muted-foreground/60'>—</span>
                        )}
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
