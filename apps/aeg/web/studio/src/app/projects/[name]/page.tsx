import { Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components/card'
import { NextLink } from '@atta/ui/lib/next-link'
import { Archive, ArrowRight, GitBranch } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { iterationsForProject, readProject, type IterationSummary } from '@/lib/aeg-fs'

type Params = { name: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { name } = await params
  return { title: `${name} · AEG Studio` }
}

export default async function ProjectPage({ params }: { params: Promise<Params> }) {
  const { name } = await params
  const project = await readProject(name)
  if (!project) notFound()
  const { active, archived } = await iterationsForProject(name)

  return (
    <div className='space-y-8'>
      <header className='space-y-3'>
        <p className='font-mono text-xs uppercase tracking-widest text-muted-foreground'>Project</p>
        <h1 className='font-serif text-3xl tracking-tight text-foreground'>{project.name}</h1>
        <dl className='grid gap-2 font-mono text-xs text-muted-foreground sm:grid-cols-[10ch_1fr]'>
          <dt>path</dt>
          <dd>{project.path}</dd>
          <dt>specs</dt>
          <dd>{project.specsPath}</dd>
          <dt>state</dt>
          <dd>{project.statePath ?? 'tracked globally'}</dd>
        </dl>
      </header>

      <IterationGroup
        projectName={project.name}
        label='Active iterations'
        icon={<GitBranch className='size-4 text-muted-foreground' aria-hidden />}
        iterations={active}
        emptyHint='No active iterations touch this project.'
      />
      <IterationGroup
        projectName={project.name}
        label='Archived iterations'
        icon={<Archive className='size-4 text-muted-foreground' aria-hidden />}
        iterations={archived}
        emptyHint='No archived iterations yet.'
      />
    </div>
  )
}

function IterationGroup({
  projectName,
  label,
  icon,
  iterations,
  emptyHint
}: {
  projectName: string
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
      </h2>
      {iterations.length === 0 ? (
        <p className='font-sans text-sm text-muted-foreground/70'>{emptyHint}</p>
      ) : (
        <div className='grid gap-3'>
          {iterations.map((it) => (
            <NextLink
              key={it.fileSlug}
              variant='unstyled'
              href={`/projects/${projectName}/iterations/${it.fileSlug}`}
              className='group block rounded-lg border border-border bg-card transition-colors hover:border-accent'
            >
              <Card className='border-0 bg-transparent'>
                <CardHeader className='pb-2'>
                  <CardTitle className='flex items-center justify-between gap-3 font-serif text-lg text-card-foreground'>
                    <span className='truncate'>{it.name}</span>
                    <ArrowRight className='size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent' />
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-1'>
                  {it.goal ? <p className='line-clamp-2 font-sans text-sm text-card-foreground/85'>{it.goal}</p> : null}
                  <p className='font-mono text-xs text-muted-foreground'>
                    {it.taskCount} task{it.taskCount === 1 ? '' : 's'}
                  </p>
                </CardContent>
              </Card>
            </NextLink>
          ))}
        </div>
      )}
    </section>
  )
}
