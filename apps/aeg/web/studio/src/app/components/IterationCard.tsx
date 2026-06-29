import { Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { ArrowRight } from 'lucide-react'
import type { IterationSummary } from '@/lib/aeg-fs'

type TaskProgressProps = {
  counts: IterationSummary['taskCounts']
}

function TaskProgress({ counts }: TaskProgressProps) {
  const { total, done, ongoing, todo, forgeAvailable } = counts

  if (!forgeAvailable) {
    return (
      <p>
        {total} task{total === 1 ? '' : 's'}
      </p>
    )
  }

  if (done === total) {
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
        </span>
        <span>{pct}%</span>
      </div>
    </div>
  )
}

type IterationCardProps = {
  iteration: IterationSummary
  href: string | null
  showProjects?: boolean
}

export function IterationCard({ iteration: it, href, showProjects = false }: IterationCardProps) {
  const wrapperClassName = 'rounded-lg border border-border bg-card transition-colors hover:border-accent group block'

  const content = (
    <Card className='border-0 bg-transparent'>
      <CardHeader className='pb-2'>
        <CardTitle className='flex items-center justify-between font-serif text-xl text-card-foreground'>
          <span>{it.name}</span>
          {href ? (
            <ArrowRight className='size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent' />
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-2 font-mono text-xs text-muted-foreground'>
        {showProjects && it.projects.length > 0 && <p>projects · {it.projects.join(' · ')}</p>}
        {it.goal && <p className='line-clamp-2 font-sans text-xs'>{it.goal}</p>}
        <TaskProgress counts={it.taskCounts} />
      </CardContent>
    </Card>
  )

  if (!href) {
    return <div className={wrapperClassName}>{content}</div>
  }

  return (
    <NextLink variant='unstyled' href={href} className={wrapperClassName}>
      {content}
    </NextLink>
  )
}
