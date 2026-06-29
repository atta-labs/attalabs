import { Badge, Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import type { DerivedStatus, DerivedTask } from '@atta/aeg-core'
import { AlertTriangle } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { readIteration, readProject } from '@/lib/aeg-fs'
import { loadIterationSnapshot } from '@/lib/forge/load-snapshot'
import { STATUS_ORDER, statusVisual } from '../_lib/status-display'

// Forge reads derive live Issue/PR state from GitHub — never serve from cache.
export const dynamic = 'force-dynamic'

type Params = { name: string; slug: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { name, slug } = await params
  return { title: `${slug} · board · ${name} · AEG Studio` }
}

export default async function IterationBoardPage({ params }: { params: Promise<Params> }) {
  const { name, slug } = await params
  const [project, detail] = await Promise.all([readProject(name), readIteration(slug)])
  if (!project) notFound()
  if (!detail) notFound()

  const { iteration, archived } = detail
  const snapshot = await loadIterationSnapshot(iteration, slug)
  const iterationHref = `/projects/${project.name}/iterations/${slug}`
  const grouped = groupByStatus(snapshot.derived.tasks)

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
        <span className='text-foreground/80'>board</span>
      </nav>

      <header className='space-y-3'>
        <div className='flex items-center gap-3'>
          <p className='font-mono text-xs uppercase tracking-widest text-muted-foreground'>Iteration · Board</p>
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

      {snapshot.unavailable ? (
        <div className='flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-warning'>
          <AlertTriangle className='size-4 shrink-0 translate-y-0.5' aria-hidden />
          <p className='font-sans text-xs leading-relaxed'>
            Live status unavailable — every task is shown as <span className='font-mono'>todo</span> until GitHub facts
            can be loaded. Set <span className='font-mono'>GITHUB_TOKEN</span>, run{' '}
            <span className='font-mono'>gh auth login</span>, or set <span className='font-mono'>AEG_REPO</span> to this
            repo's <span className='font-mono'>owner/name</span>.
          </p>
        </div>
      ) : null}

      <section className='space-y-3'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h2 className='font-mono text-xs uppercase tracking-widest text-muted-foreground'>Derived status</h2>
          <p className='font-sans text-xs text-muted-foreground/70'>
            Columns = derived statuses from <span className='font-mono'>iterations/README.md</span> §3.
          </p>
        </div>

        {iteration.tasks.length === 0 ? (
          <p className='font-sans text-sm text-muted-foreground/70'>
            No tasks declared in this iteration's topology table.
          </p>
        ) : (
          <div className='grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3'>
            {STATUS_ORDER.map((status) => (
              <BoardColumn
                key={status}
                status={status}
                tasks={grouped.get(status) ?? []}
                projectName={project.name}
                iterationSlug={slug}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function BoardColumn({
  status,
  tasks,
  projectName,
  iterationSlug
}: {
  status: DerivedStatus
  tasks: DerivedTask[]
  projectName: string
  iterationSlug: string
}) {
  const visual = statusVisual(status)
  return (
    <div className={`rounded-lg border ${visual.accentClass} bg-card`}>
      <div className='flex items-center justify-between gap-2 border-b border-border px-3 py-2'>
        <span className='font-mono text-[0.7rem] uppercase tracking-[0.12em] text-foreground'>{visual.label}</span>
        <span className='font-mono text-[0.65rem] text-muted-foreground'>{tasks.length}</span>
      </div>
      <div className='space-y-2 p-2'>
        {tasks.length === 0 ? (
          <p className='px-1 py-2 font-sans text-[0.7rem] text-muted-foreground/60'>{visual.description}</p>
        ) : (
          tasks.map((dt) => (
            <TaskCard key={dt.task.id} derived={dt} projectName={projectName} iterationSlug={iterationSlug} />
          ))
        )}
      </div>
    </div>
  )
}

function TaskCard({
  derived,
  projectName,
  iterationSlug
}: {
  derived: DerivedTask
  projectName: string
  iterationSlug: string
}) {
  const { task, blockers } = derived
  const totalBlockers = blockers.dependsOnNotMerged.length + blockers.conflictsWithOpenOrInFlight.length
  return (
    <NextLink
      variant='unstyled'
      href={`/projects/${projectName}/iterations/${iterationSlug}/tasks/${task.id}`}
      className='block rounded-md border border-border bg-background transition-colors hover:border-accent'
    >
      <Card className='border-0 bg-transparent shadow-none'>
        <CardHeader className='gap-1 px-3 py-2'>
          <CardTitle className='flex items-center justify-between gap-2 font-mono text-sm font-semibold text-foreground'>
            <span>{task.id}</span>
            {task.issue !== null ? (
              <span className='font-mono text-[0.65rem] text-muted-foreground'>#{task.issue}</span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-2 px-3 pb-3'>
          <p className='line-clamp-3 font-sans text-xs text-card-foreground/85'>{task.title}</p>
          {task.projects.length > 0 ? (
            <div className='flex flex-wrap gap-1'>
              {task.projects.map((p) => (
                <Badge
                  key={p}
                  className='bg-muted/40 text-muted-foreground border-border font-mono text-[0.6rem] uppercase tracking-wider'
                >
                  {p}
                </Badge>
              ))}
            </div>
          ) : null}
          {totalBlockers > 0 ? (
            <p className='flex items-center gap-1 font-mono text-[0.65rem] text-muted-foreground'>
              <AlertTriangle className='size-3 text-warning' aria-hidden />
              <span>
                {totalBlockers} blocker{totalBlockers === 1 ? '' : 's'}
              </span>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </NextLink>
  )
}

function groupByStatus(tasks: DerivedTask[]): Map<DerivedStatus, DerivedTask[]> {
  const map = new Map<DerivedStatus, DerivedTask[]>()
  for (const status of STATUS_ORDER) map.set(status, [])
  for (const task of tasks) {
    const bucket = map.get(task.status)
    if (bucket) bucket.push(task)
  }
  return map
}
