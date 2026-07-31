import { Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { ArrowRight } from 'lucide-react'
import { Fragment } from 'react'
import type { TrancheSummary } from '@/lib/repo-state'
import { NO_BOARD_REASON } from '@/app/studio/_lib/tranche-href'
import { deriveTrancheStatus } from '@/app/studio/_lib/tranche-status'

type TaskProgressProps = {
  counts: TrancheSummary['taskCounts']
  archived: boolean
}

function TaskProgress({ counts, archived }: TaskProgressProps) {
  const { total, done, ongoing, todo, blocked, dropped, incoherent, backlog, forgeAvailable } = counts

  if (!forgeAvailable) {
    return (
      <p>
        {total} task{total === 1 ? '' : 's'}
      </p>
    )
  }

  // An archived tranche's counts are forced to done === total (`read-root.ts`),
  // so this chip already covered both `archived` and `awaiting-archive` before
  // the shared derivation existed — "not active" preserves that, unchanged.
  if (deriveTrancheStatus(counts, archived) !== 'active') {
    return (
      <span className='inline-block rounded border border-success/50 px-1.5 py-0.5 font-mono text-xs font-medium uppercase tracking-wider text-success'>
        done
      </span>
    )
  }

  // A dropped task is out of the ratio entirely rather than counted against
  // it: the bar measures the work that can still ship, and a tranche whose
  // every remaining task merged reads 100%, not 94%.
  const shippable = total - dropped
  const pct = shippable > 0 ? Math.round((done / shippable) * 100) : 0

  // Built as a list so a bucket that is zero simply isn't in it — the old
  // hand-chained `x > 0 && ' · '` separators had to know about every other
  // bucket, and each new bucket squared the conditions.
  const segments = [
    { key: 'done', label: `${done} done`, count: done, className: 'text-success' },
    { key: 'ongoing', label: `${ongoing} active`, count: ongoing, className: 'text-primary' },
    { key: 'todo', label: `${todo} to do`, count: todo },
    { key: 'blocked', label: `${blocked} blocked`, count: blocked, className: 'text-warning' },
    // Resolved, not outstanding — muted, and never dressed as done.
    { key: 'dropped', label: `${dropped} dropped`, count: dropped, className: 'text-muted-foreground/70' },
    // A closed Issue with no merged PR. Named, because it is a real defect.
    { key: 'incoherent', label: `${incoherent} incoherent`, count: incoherent, className: 'text-destructive' },
    // Never emitted for a tranche task today, so normally absent from this
    // list — but rendered rather than dropped, because a bucket the data layer
    // keeps and the card omits is a task the card silently fails to account
    // for (17 done, 94%, and no sign of the 18th).
    { key: 'backlog', label: `${backlog} backlog`, count: backlog, className: 'text-muted-foreground/70' }
  ].filter((segment) => segment.count > 0)

  return (
    <div className='space-y-1'>
      <div className='h-1 overflow-hidden rounded-full bg-muted'>
        <div className='h-full rounded-full bg-success' style={{ width: `${pct}%` }} />
      </div>
      <div className='flex items-center justify-between'>
        <span>
          {segments.map((segment, i) => (
            <Fragment key={segment.key}>
              {i > 0 && ' · '}
              <span className={segment.className}>{segment.label}</span>
            </Fragment>
          ))}
        </span>
        <span>{pct}%</span>
      </div>
    </div>
  )
}

type TrancheCardProps = {
  tranche: TrancheSummary
  href: string | null
  showProjects?: boolean
}

export function TrancheCard({ tranche: it, href, showProjects = false }: TrancheCardProps) {
  const wrapperClassName = 'group block'

  const content = (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='flex items-center justify-between font-serif text-xl text-card-foreground'>
          <span>{it.name}</span>
          {href ? (
            <ArrowRight className='size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary' />
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-2 font-mono text-xs text-muted-foreground'>
        {showProjects && it.projects.length > 0 && <p>projects · {it.projects.join(' · ')}</p>}
        {!href && <p className='font-sans text-xs text-muted-foreground/70'>{NO_BOARD_REASON}</p>}
        {it.goal && <p className='line-clamp-2 font-sans text-xs'>{it.goal}</p>}
        <TaskProgress counts={it.taskCounts} archived={it.archived} />
      </CardContent>
    </Card>
  )

  // No project → no board route exists. The card says why, both inline and on
  // hover, rather than reading as a link that quietly does nothing.
  if (!href) {
    return (
      <div className={`${wrapperClassName} cursor-help`} title={NO_BOARD_REASON}>
        {content}
      </div>
    )
  }

  return (
    <NextLink variant='unstyled' href={href} className={wrapperClassName}>
      {content}
    </NextLink>
  )
}
