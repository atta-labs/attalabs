'use client'

// The `/labels` SUBPATH, never the package barrel. `labels.ts` is pure data
// with zero imports, but `@attalabs/aeg-forge-state`'s index re-exports `gh.ts`,
// which uses `node:child_process` — pulling that into a `'use client'` module
// breaks the Turbopack browser build outright ("the chunking context does not
// support external modules"). Same hazard `display-label.ts` and
// `DiagramExplorer.tsx` already document; `bun run check` does not catch it
// because it never runs `next build`.
import { label, LABEL_NAMESPACE } from '@attalabs/aeg-forge-state/labels'
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@atta/ui/components'
import { Filter, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { BacklogIssue } from '@/lib/forge/fetch-open-issues'
import { LabelBadge, ProjectBadge, splitLabels } from '@/app/studio/_components/LabelBadge'

/**
 * The backlog as a filterable table (task 11 #571 follow-up). Replaces the
 * grouped-cards layout: one row per Issue, so a cross-project Issue (#513,
 * `Project: aeg, aeg-core`) is a single row carrying BOTH project badges
 * instead of being duplicated under two headings — and the project filter
 * matches it under either (never drop the second project). Projects come
 * from the Issue body's `**Project:**` field, not from a label (#614).
 *
 * Filters are project, tier, type, and flags — the families that actually vary
 * across backlog rows. Tranche and state do NOT vary here: the backlog is
 * defined as open Issues carrying NO `vinaya/tranche:*` label
 * (`fetch-open-issues.ts`), so every row is open and tranche-less. A row
 * matches when it carries ANY selected project (multi-project rows match
 * either) AND its tier is selected AND its type is selected AND it carries
 * any selected flag; an empty family means "all" for that family. Filters
 * are inline toggle chips (not a dropdown) — every option is visible at a
 * glance, and they wrap on narrow screens.
 *
 * The `#` and Title columns are split (like the tranche board's table). The
 * table sets a `min-w` so the library Table's own `overflow-auto` scroll
 * container kicks in on narrow screens instead of cramming the columns.
 *
 * `type` (task 11 #854) shares the Tier column, renamed "Tier / Type" —
 * both are classification facts about what the Issue IS (impact, commit-type
 * shape), not the state/flag/needs family's "what needs attention" — rather
 * than crowding into the Flags cell, which would blur that distinction and
 * make the "Flags" header inaccurate. The `table-fixed` width budget is
 * already fully allocated (6/32/20/10/32), so this column's 10% is unchanged;
 * `LABEL_CELL` already wraps a cell's badges, so a second badge just grows
 * row height instead of breaking the layout.
 *
 * Label styling is keyed to a label's CATEGORY (read from the code-owned
 * vocabulary), never its value — one flat semantic-token variant per family
 * (the doctrine forbids a per-value palette). `needs:*` reads `warning`; there
 * is no `info`/blue token.
 */

function Dash() {
  return <span className='font-mono text-xs text-muted-foreground/60'>—</span>
}

/**
 * The label cells' wrapper (task 11 #624). `table-fixed` means a column never
 * grows to fit its content, so a long label like `vinaya/needs:decomposition` has to
 * wrap INSIDE its column or it clips/overlaps the neighbour. Some libraries'
 * `Badge` ships `whitespace-nowrap` + a fixed `h-5` + `overflow-hidden` (retro),
 * which does exactly that — so the wrapper relaxes those three on its children
 * rather than editing `LabelBadge` (the badge is shared, and the constraint is
 * this table's `table-fixed` layout, not the badge's). `break-words` lets a
 * single unbreakable label split only when it genuinely cannot fit.
 */
const LABEL_CELL =
  'flex min-w-0 flex-wrap gap-1 [&>*]:h-auto [&>*]:max-w-full [&>*]:overflow-visible [&>*]:break-words [&>*]:whitespace-normal'

/** Ties the filter chip group to its heading (`aria-labelledby`). */
const FILTER_HEADING_ID = 'backlog-filter-heading'

/** Tier chips drop the whole family prefix, not just the product one — `vinaya/tier:1` reads `1`. */
const TIER_STRIP = label('tier-0').replace(/0$/, '')

/** Type chips drop the whole family prefix, not just the product one — `vinaya/type:feat` reads `feat`. */
const TYPE_STRIP = label('type-build').replace(/build$/, '')

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
        active ? 'border-primary bg-accent text-accent-foreground hover:bg-accent/90' : 'text-muted-foreground'
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
  /**
   * Prefix dropped from the chip's DISPLAY text only — the full option string
   * is what filters. Guarded, not a blind slice: an option that does not carry
   * the prefix renders whole rather than losing its first `strip.length`
   * characters.
   */
  strip?: string
}) {
  if (options.length === 0) return null
  return (
    <div className='flex flex-wrap items-center gap-1.5'>
      <span className='font-mono text-xs uppercase tracking-wider text-foreground'>{name}</span>
      {options.map((option) => (
        <FilterChip
          key={option}
          label={option.startsWith(strip) ? option.slice(strip.length) : option}
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
  typeOptions,
  flagOptions
}: {
  issues: BacklogIssue[]
  /** Distinct project names declared across the backlog, in registry order. */
  projectOptions: string[]
  /** Distinct tier labels present, low tier first. */
  tierOptions: string[]
  /** Distinct type labels present. */
  typeOptions: string[]
  /** Distinct flag labels present. */
  flagOptions: string[]
}) {
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set())
  const [selectedTiers, setSelectedTiers] = useState<Set<string>>(new Set())
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set())
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
        const { tier, type, flags } = splitLabels(issue.labels)
        const projectOk = selectedProjects.size === 0 || issue.projects.some((p) => selectedProjects.has(p))
        const tierOk = selectedTiers.size === 0 || (tier !== null && selectedTiers.has(tier))
        const typeOk = selectedTypes.size === 0 || (type !== null && selectedTypes.has(type))
        const flagOk = selectedFlags.size === 0 || flags.some((f) => selectedFlags.has(f))
        return projectOk && tierOk && typeOk && flagOk
      }),
    [issues, selectedProjects, selectedTiers, selectedTypes, selectedFlags]
  )

  const anyFilter =
    selectedProjects.size > 0 || selectedTiers.size > 0 || selectedTypes.size > 0 || selectedFlags.size > 0

  return (
    <div className='space-y-3'>
      {/* Heading for the chip rows below — icon pinned far-left, so the filter
          block reads as one labelled unit rather than loose chips. A real `h2`
          (the page's `h1` is "Backlog", and there is no other `h2`, so this
          skips no level), and the chip block is a `group` labelled BY it — the
          heading has to be programmatic, not just visual, or the five filter
          controls carry no accessible name at all. */}
      <div className='flex items-center gap-2'>
        <Filter className='size-3.5 shrink-0 text-muted-foreground' aria-hidden />
        <h2 id={FILTER_HEADING_ID} className='font-mono text-xs uppercase tracking-wider text-muted-foreground'>
          Filter by
        </h2>
      </div>

      <div role='group' aria-labelledby={FILTER_HEADING_ID} className='flex flex-wrap items-center gap-x-4 gap-y-2'>
        <FilterGroup
          name='Project'
          options={projectOptions}
          selected={selectedProjects}
          onToggle={toggle(setSelectedProjects)}
        />
        <FilterGroup
          name='Tier'
          options={tierOptions}
          selected={selectedTiers}
          onToggle={toggle(setSelectedTiers)}
          strip={TIER_STRIP}
        />
        <FilterGroup
          name='Type'
          options={typeOptions}
          selected={selectedTypes}
          onToggle={toggle(setSelectedTypes)}
          strip={TYPE_STRIP}
        />
        {/* Flags mixes families (needs / blocked / detection flags), so only the
            `vinaya/` product prefix comes off — never a family prefix. */}
        <FilterGroup
          name='Flags'
          options={flagOptions}
          selected={selectedFlags}
          onToggle={toggle(setSelectedFlags)}
          strip={LABEL_NAMESPACE}
        />
        {anyFilter && (
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='h-7 gap-1 font-mono text-xs text-muted-foreground'
            onClick={() => {
              setSelectedProjects(new Set())
              setSelectedTiers(new Set())
              setSelectedTypes(new Set())
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
      <div>
        <Table stickyHeader className='min-w-[720px] table-fixed'>
          <TableHeader>
            <TableRow>
              {/* `table-fixed` widths are one budget — widening Flags (its labels
                  are the longest, and they must wrap in-column) is paid for out
                  of Title, which already wraps freely. Sums to 100%. */}
              <TableHead className='w-[6%] px-2 font-semibold text-foreground'>#</TableHead>
              <TableHead className='w-[32%] font-semibold text-foreground'>Title</TableHead>
              <TableHead className='w-[20%] font-semibold text-foreground'>Project(s)</TableHead>
              <TableHead className='w-[10%] font-semibold text-foreground'>Tier / Type</TableHead>
              <TableHead className='w-[32%] font-semibold text-foreground'>Flags</TableHead>
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
                const { tier, type, flags } = splitLabels(issue.labels)
                return (
                  <TableRow key={issue.number}>
                    <TableCell className='px-2 align-top'>
                      <a
                        href={issue.url}
                        target='_blank'
                        rel='noreferrer'
                        className='whitespace-nowrap font-mono text-xs text-muted-foreground hover:text-primary hover:underline'
                      >
                        #{issue.number}
                      </a>
                    </TableCell>
                    <TableCell className='align-top'>
                      <a
                        href={issue.url}
                        target='_blank'
                        rel='noreferrer'
                        className='block break-words font-sans text-sm text-card-foreground hover:text-primary hover:underline'
                      >
                        {issue.title}
                      </a>
                    </TableCell>
                    <TableCell className='align-top'>
                      <div className={LABEL_CELL}>
                        {issue.projects.length > 0 ? (
                          issue.projects.map((project) => <ProjectBadge key={project} project={project} />)
                        ) : (
                          <Dash />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className='align-top'>
                      <div className={LABEL_CELL}>
                        {tier ? <LabelBadge label={tier} /> : null}
                        {type ? <LabelBadge label={type} /> : null}
                        {!tier && !type ? <Dash /> : null}
                      </div>
                    </TableCell>
                    <TableCell className='align-top'>
                      <div className={LABEL_CELL}>
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
