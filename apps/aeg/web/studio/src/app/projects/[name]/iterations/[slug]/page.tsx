import { Badge } from '@atta/ui/components/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@atta/ui/components/table'
import { NextLink } from '@atta/ui/lib/next-link'
import { GitBranch, LayoutGrid } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { readIteration, readProject } from '@/lib/aeg-fs'

type Params = { name: string; slug: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { name, slug } = await params
  return { title: `${slug} · ${name} · AEG Studio` }
}

export default async function IterationPage({ params }: { params: Promise<Params> }) {
  const { name, slug } = await params
  const [project, detail] = await Promise.all([readProject(name), readIteration(slug)])
  if (!project) notFound()
  if (!detail) notFound()

  const { iteration, archived } = detail

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
        <span className='text-foreground/80'>{iteration.name || slug}</span>
      </nav>

      <header className='space-y-3'>
        <div className='flex items-center gap-3'>
          <p className='font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground'>Iteration</p>
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

      <section className='space-y-3'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h2 className='font-sans text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground'>
            Tasks (topology)
          </h2>
          {iteration.tasks.length > 0 ? (
            <div className='flex flex-wrap items-center gap-2'>
              <NextLink
                variant='unstyled'
                href={`/projects/${project.name}/iterations/${slug}/board`}
                className='inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-accent hover:text-accent'
              >
                <LayoutGrid className='size-3.5' aria-hidden />
                <span>View as board</span>
              </NextLink>
              <NextLink
                variant='unstyled'
                href={`/projects/${project.name}/iterations/${slug}/graph`}
                className='inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-accent hover:text-accent'
              >
                <GitBranch className='size-3.5' aria-hidden />
                <span>View as graph</span>
              </NextLink>
            </div>
          ) : null}
        </div>
        {iteration.tasks.length === 0 ? (
          <p className='font-sans text-sm text-muted-foreground/70'>
            No tasks declared in this iteration's topology table.
          </p>
        ) : (
          <div className='rounded-lg border border-border bg-card'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-16 font-sans text-xs uppercase tracking-wider'>#</TableHead>
                  <TableHead className='font-sans text-xs uppercase tracking-wider'>Task</TableHead>
                  <TableHead className='w-20 font-sans text-xs uppercase tracking-wider'>Issue</TableHead>
                  <TableHead className='font-sans text-xs uppercase tracking-wider'>Project(s)</TableHead>
                  <TableHead className='font-sans text-xs uppercase tracking-wider'>Depends on</TableHead>
                  <TableHead className='font-sans text-xs uppercase tracking-wider'>Conflicts with</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {iteration.tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className='font-mono text-sm font-semibold text-foreground'>{task.id}</TableCell>
                    <TableCell className='font-sans text-sm text-card-foreground'>{task.title}</TableCell>
                    <TableCell className='font-mono text-xs text-muted-foreground'>
                      {task.issue !== null ? `#${task.issue}` : '—'}
                    </TableCell>
                    <TableCell>
                      <EdgeList items={task.projects} variant='project' />
                    </TableCell>
                    <TableCell>
                      <EdgeList items={task.dependsOn} variant='edge' />
                    </TableCell>
                    <TableCell>
                      <EdgeList items={task.conflictsWith} variant='edge' />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {iteration.backlog.length > 0 && (
        <section className='space-y-3'>
          <h2 className='font-sans text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground'>Backlog</h2>
          <ul className='space-y-1.5 font-sans text-sm text-muted-foreground'>
            {iteration.backlog.map((item) => (
              <li key={item} className='leading-relaxed'>
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function EdgeList({ items, variant }: { items: string[]; variant: 'project' | 'edge' }) {
  if (items.length === 0) {
    return <span className='font-mono text-xs text-muted-foreground/60'>—</span>
  }
  return (
    <div className='flex flex-wrap gap-1.5'>
      {items.map((item) => (
        <Badge
          key={item}
          className={
            variant === 'project'
              ? 'bg-muted/40 text-card-foreground border-border font-mono text-xs'
              : 'bg-muted/30 text-muted-foreground border-border font-mono text-xs'
          }
        >
          {item}
        </Badge>
      ))}
    </div>
  )
}
