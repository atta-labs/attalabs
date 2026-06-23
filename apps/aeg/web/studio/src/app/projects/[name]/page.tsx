import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { iterationsForProject, readProject } from '@/lib/aeg-fs'
import { ProjectIterationsTabs } from './ProjectIterationsTabs'

// Forge reads derive live Issue/PR state from GitHub — never serve from cache.
export const dynamic = 'force-dynamic'

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

      <ProjectIterationsTabs projectName={project.name} active={active} archived={archived} />
    </div>
  )
}
