import { Badge } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { readIteration, readProject } from '@/lib/aeg-fs'
import { TaskGraph } from './_components/TaskGraph'

type Params = { name: string; slug: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { name, slug } = await params
  return { title: `${slug} · graph · ${name} · AEG Studio` }
}

export default async function IterationGraphPage({ params }: { params: Promise<Params> }) {
  const { name, slug } = await params
  const [project, detail] = await Promise.all([readProject(name), readIteration(slug)])
  if (!project) notFound()
  if (!detail) notFound()

  const { iteration, archived } = detail
  const iterationHref = `/projects/${project.name}/iterations/${slug}`

  return (
    <div className='space-y-8'>
      <nav className='font-mono text-xs text-muted-foreground'>
        <NextLink variant='unstyled' href='/projects' className='hover:text-accent'>
          projects
        </NextLink>
        <span className='px-1.5 text-muted-foreground/60'>/</span>
        <NextLink variant='unstyled' href={`/projects/${project.name}`} className='hover:text-accent'>
          {project.name}
        </NextLink>
        <span className='px-1.5 text-muted-foreground/60'>/</span>
        <NextLink variant='unstyled' href={iterationHref} className='hover:text-accent'>
          {iteration.name || slug}
        </NextLink>
        <span className='px-1.5 text-muted-foreground/60'>/</span>
        <span className='text-foreground/80'>graph</span>
      </nav>

      <header className='space-y-3'>
        <div className='flex items-center gap-3'>
          <p className='font-mono text-xs uppercase tracking-widest text-muted-foreground'>Iteration · Graph</p>
          {archived ? (
            <Badge className='bg-muted/40 text-muted-foreground border-border'>Archived</Badge>
          ) : (
            <Badge className='bg-primary/10 text-primary border-primary/40'>Active</Badge>
          )}
        </div>
        <h1 className='font-serif text-3xl tracking-tight text-foreground'>{iteration.name || slug}</h1>
        {iteration.goal ? (
          <p className='font-sans text-base text-muted-foreground'>{iteration.goal}</p>
        ) : (
          <p className='font-sans text-sm text-muted-foreground/70'>No goal recorded.</p>
        )}
      </header>

      <section className='space-y-4'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h2 className='font-mono text-xs uppercase tracking-widest text-muted-foreground'>Dependency graph</h2>
          <Legend />
        </div>
        <TaskGraph tasks={iteration.tasks} />
        <p className='font-sans text-xs text-muted-foreground/70'>
          Need the raw table?{' '}
          <NextLink
            variant='unstyled'
            href={iterationHref}
            className='underline-offset-2 hover:text-accent hover:underline'
          >
            View topology table
          </NextLink>
          .
        </p>
      </section>
    </div>
  )
}

function Legend() {
  return (
    <div className='flex flex-wrap items-center gap-4 font-mono text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground'>
      <span className='flex items-center gap-2'>
        <span className='inline-flex h-px w-8 bg-border' aria-hidden />
        <span>depends-on</span>
      </span>
      <span className='flex items-center gap-2'>
        <span className='inline-flex h-0 w-8 border-t border-dashed border-warning/80' aria-hidden />
        <span>conflicts-with</span>
      </span>
    </div>
  )
}
