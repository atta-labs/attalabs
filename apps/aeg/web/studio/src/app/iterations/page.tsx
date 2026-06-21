import { Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components/card'
import { NextLink } from '@atta/ui/lib/next-link'
import { Archive, ArrowRight, GitBranch } from 'lucide-react'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { listIterations, type IterationSummary } from '@/lib/aeg-fs'

export const metadata: Metadata = {
  title: 'Iterations · AEG Studio'
}

export default async function IterationsPage() {
  const { active, archived } = await listIterations()

  return (
    <div className='space-y-8'>
      <header className='space-y-2'>
        <h1 className='font-serif text-3xl tracking-tight text-foreground'>Iterations</h1>
        <p className='font-sans text-sm text-muted-foreground'>
          All iterations across every project, from <span className='font-mono'>aeg-root/iterations/</span>.
        </p>
      </header>

      <IterationGroup
        label='Active'
        icon={<GitBranch className='size-4 text-muted-foreground' aria-hidden />}
        iterations={active}
        emptyHint='No active iterations.'
      />
      <IterationGroup
        label='Archived'
        icon={<Archive className='size-4 text-muted-foreground' aria-hidden />}
        iterations={archived}
        emptyHint='No archived iterations yet.'
      />
    </div>
  )
}

function IterationGroup({
  label,
  icon,
  iterations,
  emptyHint
}: {
  label: string
  icon: ReactNode
  iterations: IterationSummary[]
  emptyHint: string
}) {
  return (
    <section className='space-y-3'>
      <h2 className='flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground'>
        {icon}
        <span>{label}</span>
        <span className='ml-1 tabular-nums'>({iterations.length})</span>
      </h2>
      {iterations.length === 0 ? (
        <p className='font-sans text-sm text-muted-foreground/70'>{emptyHint}</p>
      ) : (
        <div className='grid gap-3 sm:grid-cols-2'>
          {iterations.map((it) => (
            <IterationCard key={it.fileSlug} iteration={it} />
          ))}
        </div>
      )}
    </section>
  )
}

/**
 * Resolve the best detail URL for an iteration.
 *
 * The cross-product `/iterations/[slug]` detail page does not exist yet.
 * Until it is built, link through the first project that owns a task in this
 * iteration — every project-specific detail page already exists at
 * `/projects/[name]/iterations/[slug]`.
 *
 * Returns `null` when the iteration has no project affiliations (edge case:
 * an empty topology table). In that case the card renders as non-navigable.
 */
function resolveDetailHref(it: IterationSummary): string | null {
  const firstProject = it.projects[0]
  if (!firstProject) return null
  return `/projects/${firstProject}/iterations/${it.fileSlug}`
}

function IterationCard({ iteration: it }: { iteration: IterationSummary }) {
  const href = resolveDetailHref(it)

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
      <CardContent className='space-y-1 font-mono text-xs text-muted-foreground'>
        <p>
          {it.taskCount} task{it.taskCount === 1 ? '' : 's'} ·{' '}
          <span className={it.lifecycle === 'active' ? 'text-primary' : ''}>{it.lifecycle}</span>
        </p>
        {it.projects.length > 0 && <p>projects · {it.projects.join(' · ')}</p>}
        {it.goal && <p className='line-clamp-2 font-sans text-xs'>{it.goal}</p>}
      </CardContent>
    </Card>
  )

  if (!href) {
    return <div className='rounded-lg border border-border bg-card'>{content}</div>
  }

  return (
    <NextLink
      variant='unstyled'
      href={href}
      className='group block rounded-lg border border-border bg-card transition-colors hover:border-accent'
    >
      {content}
    </NextLink>
  )
}
