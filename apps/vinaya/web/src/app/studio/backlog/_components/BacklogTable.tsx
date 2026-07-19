'use client'

import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@atta/ui/components'
import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { BacklogIssue } from '@/lib/forge/fetch-open-issues'
import { LabelBadge, splitLabels } from '@/app/studio/_components/LabelBadge'

/**
 * The backlog as a filterable table (task 11 #571 follow-up). Replaces the
 * grouped-cards layout: one row per Issue, so a cross-project Issue (#513,
 * `project:aeg` + `project:aeg-core`) is a single row carrying BOTH project
 * badges instead of being duplicated under two headings — and the project
 * filter matches it under either (D-091: never drop the second project).
 *
 * Filters are project, tier, and flags — the label families that actually vary
 * across backlog rows. Iteration and state do NOT vary here: the backlog is
 * defined as open Issues carrying NO `iteration:*` label (`fetch-open-issues.ts`),
 * so every row is open and iteration-less. A row matches when it carries ANY
 * selected project (multi-project rows match either) AND its tier is selected
 * AND it carries any selected flag (`needs:*`/`status:*`); an empty family means
 * "all" for that family. Filters are inline toggle chips (not a dropdown) —
 * every option is visible at a glance, and they wrap on narrow screens.
 *
 * The `#` and Title columns are split (like the iteration board's table). The
 * table sets a `min-w` so the library Table's own `overflow-auto` scroll
 * container kicks in on narrow screens instead of cramming the columns.
 *
 * Label styling is keyed to a label's CATEGORY (its prefix), never its value —
 * one flat semantic-token variant per family (the doctrine forbids a per-value
 * palette). `needs:*` reads `warning`; there is no `info`/blue token.
 */

function Dash() {
  return <span className='font-mono text-xs text-muted-foreground/60'>—</span>
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
      <span className='font-mono text-xs uppercase tracking-wider text-foreground'>{name}</span>
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
      </div>

      {/* Data table — header pins on scroll by default (`@atta/ui` Table). No
          `overflow-hidden` on the card: the pinned header must be free to stick to
          the Studio shell, and horizontal overflow must reach the shell to scroll. */}
      <div className='rounded-lg border border-border bg-card'>
        <Table className='min-w-[720px] table-fixed'>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[6%] px-2 font-semibold text-foreground'>#</TableHead>
              <TableHead className='w-[37%] font-semibold text-foreground'>Title</TableHead>
              <TableHead className='w-[20%] font-semibold text-foreground'>Project(s)</TableHead>
              <TableHead className='w-[11%] font-semibold text-foreground'>Tier</TableHead>
              <TableHead className='w-[26%] font-semibold text-foreground'>Flags</TableHead>
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
                    <TableCell className='px-2 align-top'>
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
