'use client'

import { Badge, Button } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { DashboardTask, TaskCategory } from '@/app/studio/_lib/load-dashboard-tasks'

/**
 * The dashboard's Tasks card body (task 11 #571) — every Ready / active /
 * blocked iteration task plus the backlog, filterable by status category. A row
 * is just its status badge, title, and iteration (backlog rows have none) — no
 * labels or other detail. Badges are pre-resolved by the loader (from
 * `status-display.ts`, the one vocabulary), so this stays purely presentational;
 * it only filters, sorts, and lays out. Categories offered are the ones actually
 * present, mirroring the backlog table's "options from present" rule.
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
      <div className='flex flex-wrap items-center gap-1.5'>
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
                active ? 'border-accent bg-accent text-accent-foreground hover:bg-accent/90' : 'text-muted-foreground'
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

      {filtered.length === 0 ? (
        <p className='font-sans text-xs text-muted-foreground/70'>No tasks match these filters.</p>
      ) : (
        <div className='space-y-2'>
          {filtered.map((task) => {
            const key = `${task.iterationSlug ?? 'backlog'}-${task.taskId}`
            return (
              <div key={key} className='flex flex-wrap items-center gap-2 font-mono text-xs'>
                {task.issue != null &&
                  (task.issueUrl ? (
                    <a
                      href={task.issueUrl}
                      target='_blank'
                      rel='noreferrer'
                      className='shrink-0 text-muted-foreground hover:text-accent hover:underline'
                    >
                      #{task.issue}
                    </a>
                  ) : (
                    <span className='shrink-0 text-muted-foreground'>#{task.issue}</span>
                  ))}
                <Badge
                  variant='outline'
                  className={`shrink-0 font-mono text-xs ${task.badge.badgeClass}`}
                  title={task.badge.title}
                >
                  {task.badge.label}
                </Badge>
                <span className='text-card-foreground'>{task.title}</span>
                {task.iterationSlug && (
                  <span className='text-muted-foreground/70'>
                    ·{' '}
                    {task.iterationHref ? (
                      <NextLink
                        variant='unstyled'
                        href={task.iterationHref}
                        className='hover:text-accent hover:underline'
                      >
                        {task.iterationSlug}
                      </NextLink>
                    ) : (
                      task.iterationSlug
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
