import { Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { ArrowRight } from 'lucide-react'
import type { TrancheSummary } from '@/lib/repo-state'
import { NO_BOARD_REASON } from '@/app/studio/_lib/tranche-href'
import { deriveTrancheStatus } from '@/app/studio/_lib/tranche-status'

type TaskProgressProps = {
  counts: TrancheSummary['taskCounts']
  archived: boolean
}

function TaskProgress({ counts, archived }: TaskProgressProps) {
  const { total, done, ongoing, todo, blocked, forgeAvailable } = counts

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

  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className='space-y-1'>
      <div className='h-1 overflow-hidden rounded-full bg-muted'>
        <div className='h-full rounded-full bg-success' style={{ width: `${pct}%` }} />
      </div>
      <div className='flex items-center justify-between'>
        <span>
          {done > 0 && <span className='text-success'>{done} done</span>}
          {done > 0 && ongoing > 0 && ' · '}
          {ongoing > 0 && <span className='text-primary'>{ongoing} active</span>}
          {(done > 0 || ongoing > 0) && todo > 0 && ' · '}
          {todo > 0 && <span>{todo} to do</span>}
          {(done > 0 || ongoing > 0 || todo > 0) && blocked > 0 && ' · '}
          {blocked > 0 && <span className='text-warning'>{blocked} blocked</span>}
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
