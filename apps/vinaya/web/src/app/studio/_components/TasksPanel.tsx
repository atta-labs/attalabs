'use client'

import { Badge, Button } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Filter, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { DashboardTask, TaskCategory } from '@/app/studio/_lib/load-dashboard-tasks'
import { NO_BOARD_REASON } from '@/app/studio/_lib/iteration-href'

/**
 * The dashboard's Tasks card body (task 11 #571) — every Ready / active /
 * blocked iteration task plus the backlog, filterable by status category. A row
 * is just its status badge, title, and iteration (backlog rows have none) — no
 * labels or other detail. Badges are pre-resolved by the loader (from
 * `status-display.ts`, the one vocabulary), so this stays purely presentational;
 * it only filters, sorts, and lays out. Categories offered are the ones actually
 * present, mirroring the backlog table's "options from present" rule — and the
 * chip row carries the same `Filter by` heading treatment the backlog table
 * landed (task 11, #624) — icon, heading, and `role='group'` labelled by it —
 * so both filter surfaces read, and are announced, as one control.
 *
 * A row is flex, not a table, but the issue cell is a fixed-width column
 * (`min-w-12` + `tabular-nums`, rendered even when a task has no Issue) so
 * `#38` and `#1852` leave the badge and title starting at the same x. The
 * iteration is pushed to the far right (`ml-auto`) for the same reason: row
 * alignment must not depend on how long the title or the issue number is.
 */

const CATEGORY_LABEL: Record<TaskCategory, string> = {
  ready: 'Ready',
  'in-flight': 'In-flight',
  'in-review': 'In review',
  'changes-requested': 'Changes requested',
  blocked: 'Blocked',
  backlog: 'Backlog'
}

// Display order for the filter chips and rows — moving, pickable, stuck, then
// unscheduled backlog.
const CATEGORY_ORDER: TaskCategory[] = ['in-review', 'changes-requested', 'in-flight', 'ready', 'blocked', 'backlog']

/** Ties the filter chip group to its heading (`aria-labelledby`). */
const FILTER_HEADING_ID = 'tasks-filter-heading'

export function TasksPanel({ tasks }: { tasks: DashboardTask[] }) {
  const [selected, setSelected] = useState<Set<TaskCategory>>(new Set())

  const sorted = useMemo(
    () => [...tasks].sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)),
    [tasks]
  )
  const present = useMemo(() => CATEGORY_ORDER.filter((c) => sorted.some((t) => t.category === c)), [sorted])
  const filtered = useMemo(
    () => (selected.size === 0 ? sorted : sorted.filter((t) => selected.has(t.category))),
    [sorted, selected]
  )

  const toggle = (category: TaskCategory) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })

  return (
    <div className='space-y-3'>
      {/* Same heading treatment the backlog table landed (task 11, #624): icon
          pinned far-left of its own row, and the chip block is a `group`
          labelled BY the heading — visual labelling alone would leave these
          controls with no accessible name. An `h2`, as on the backlog page: the
          `/studio` home's only heading is its `h1` ("Vinaya Studio") — the card
          titles are `CardTitle` divs, not headings — so this skips no level. */}
      <div className='flex items-center gap-2'>
        <Filter className='size-3.5 shrink-0 text-muted-foreground' aria-hidden />
        <h2 id={FILTER_HEADING_ID} className='font-mono text-xs uppercase tracking-wider text-muted-foreground'>
          Filter by
        </h2>
      </div>

      <div role='group' aria-labelledby={FILTER_HEADING_ID} className='flex flex-wrap items-center gap-1.5'>
        {present.map((category) => {
          const active = selected.has(category)
          return (
            <Button
              key={category}
              type='button'
              variant={active ? 'default' : 'outline'}
              size='sm'
              onClick={() => toggle(category)}
              aria-pressed={active}
              className={`h-7 font-mono text-xs ${
                active ? 'border-primary bg-accent text-accent-foreground hover:bg-accent/90' : 'text-muted-foreground'
              }`}
            >
              {CATEGORY_LABEL[category]}
            </Button>
          )
        })}
        {selected.size > 0 && (
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='h-7 gap-1 font-mono text-xs text-muted-foreground'
            onClick={() => setSelected(new Set())}
          >
            <X className='size-3.5' aria-hidden />
            Clear
          </Button>
        )}
      </div>

      {/* `pt-2` on top of the wrapper's `space-y-3`: a small extra beat that
          separates the controls from the results they act on. */}
      {filtered.length === 0 ? (
        <p className='pt-2 font-sans text-xs text-muted-foreground/70'>No tasks match these filters.</p>
      ) : (
        <div className='space-y-2 pt-2'>
          {filtered.map((task) => {
            const key = `${task.iterationSlug ?? 'backlog'}-${task.taskId}`
            return (
              <div key={key} className='flex flex-wrap items-center gap-2 font-mono text-xs'>
                {/* Always rendered, Issue or not — it is the row's first column. */}
                <span className='min-w-12 shrink-0 text-muted-foreground tabular-nums'>
                  {task.issue != null &&
                    (task.issueUrl ? (
                      <a
                        href={task.issueUrl}
                        target='_blank'
                        rel='noreferrer'
                        className='hover:text-primary hover:underline'
                      >
                        #{task.issue}
                      </a>
                    ) : (
                      `#${task.issue}`
                    ))}
                </span>
                <Badge
                  variant='outline'
                  className={`shrink-0 font-mono text-xs ${task.badge.badgeClass}`}
                  title={task.badge.title}
                >
                  {task.badge.label}
                </Badge>
                <span className='text-card-foreground'>{task.title}</span>
                {task.iterationSlug && (
                  <span className='ml-auto shrink-0 pl-2 text-muted-foreground/70'>
                    {task.iterationHref ? (
                      <NextLink
                        variant='unstyled'
                        href={task.iterationHref}
                        className='hover:text-primary hover:underline'
                      >
                        {task.iterationSlug}
                      </NextLink>
                    ) : (
                      // No project → no board route. Say why, rather than
                      // rendering the slug as an unexplained dead label.
                      <span className='cursor-help' title={NO_BOARD_REASON}>
                        {task.iterationSlug}
                      </span>
                    )}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
