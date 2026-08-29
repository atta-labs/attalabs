import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { tranchesForProject, tranchesWithNoProject, resolveProjectView } from '@/lib/repo-state'
import { forgeProjectSegment } from '@/app/studio/_lib/tranche-href'
import { ProjectTranchesTabs } from './ProjectTranchesTabs'

// Forge reads derive live Issue/PR state from GitHub — never serve from cache.
export const dynamic = 'force-dynamic'

type Params = { name: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { name } = await params
  return { title: `${name} · Vinaya Studio` }
}

export default async function ProjectPage({ params }: { params: Promise<Params> }) {
  const { name } = await params
  const view = await resolveProjectView(name)
  if (!view) notFound()

  if (view.kind === 'registered') {
    const { project } = view
    const { active, archived, forge } = await tranchesForProject(project.name)
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

        <ProjectTranchesTabs projectName={project.name} active={active} archived={archived} forge={forge} />
      </div>
    )
  }

  // Registry-absent: a forge-derived board (any name the tranches carry) or
  // the reserved default board over every projectless tranche — neither has
  // registry-declared metadata (path/specs/state), so the header says so
  // instead of rendering fields that were never derived.
  const heading = view.kind === 'default' ? 'All tranches' : view.name
  const { active, archived, forge } =
    view.kind === 'default' ? await tranchesWithNoProject() : await tranchesForProject(view.name)

  return (
    <div className='space-y-8'>
      <header className='space-y-3'>
        <h1 className='font-serif text-3xl tracking-tight text-foreground'>{heading}</h1>
        <p className='font-mono text-xs text-muted-foreground'>
          No project registry —{' '}
          {view.kind === 'default'
            ? 'every tranche without a declared project'
            : 'forge-derived from tranche declarations'}
          .
        </p>
      </header>

      <ProjectTranchesTabs projectName={forgeProjectSegment(name)} active={active} archived={archived} forge={forge} />
    </div>
  )
}
