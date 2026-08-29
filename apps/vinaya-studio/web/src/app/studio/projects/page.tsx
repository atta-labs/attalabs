import { Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'
import { listProjectViews } from '@/lib/repo-state'
import { forgeProjectSegment } from '@/app/studio/_lib/tranche-href'
import { withDefaultBoardEntry } from '@/lib/repo-state/default-board-slug'

export const metadata: Metadata = {
  title: 'Projects · Vinaya Studio'
}

export default async function ProjectsPage() {
  const listing = await listProjectViews()

  if (!listing.registryPresent) {
    // No `.vinaya/projects.md`: no registry rows to render (path/specs/state
    // are registry-declared, never derived), so each card carries only the
    // name forge-derived from the tranches, plus the reserved default board
    // for every tranche declaring no project at all.
    const cards = withDefaultBoardEntry(listing.projects)
    return (
      <div className='space-y-6'>
        <header className='space-y-2'>
          <h1 className='font-serif text-3xl tracking-tight text-foreground'>Projects</h1>
          <p className='font-sans text-sm text-muted-foreground'>
            No <span className='font-mono'>.vinaya/projects.md</span> — boards below are forge-derived from tranche
            declarations. Pick one to see its tranches.
          </p>
        </header>

        <div className='grid gap-3 sm:grid-cols-2'>
          {cards.map((project) => (
            <NextLink
              key={project.name}
              variant='unstyled'
              href={`/studio/projects/${forgeProjectSegment(project.name)}`}
              className='group block'
            >
              <Card>
                <CardHeader className='pb-2'>
                  <CardTitle className='flex items-center justify-between font-serif text-xl text-card-foreground'>
                    <span>{'label' in project ? project.label : project.name}</span>
                    <ArrowRight className='size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary' />
                  </CardTitle>
                </CardHeader>
              </Card>
            </NextLink>
          ))}
        </div>
      </div>
    )
  }

  const projects = listing.projects

  return (
    <div className='space-y-6'>
      <header className='space-y-2'>
        <h1 className='font-serif text-3xl tracking-tight text-foreground'>Projects</h1>
        <p className='font-sans text-sm text-muted-foreground'>
          Registry from <span className='font-mono'>.vinaya/projects.md</span>. Pick one to see its tranches.
        </p>
      </header>

      {projects.length === 0 ? (
        <p className='font-sans text-sm text-muted-foreground'>No projects registered.</p>
      ) : (
        <div className='grid gap-3 sm:grid-cols-2'>
          {projects.map((project) => (
            <NextLink
              key={project.name}
              variant='unstyled'
              href={`/studio/projects/${project.name}`}
              className='group block'
            >
              <Card>
                <CardHeader className='pb-2'>
                  <CardTitle className='flex items-center justify-between font-serif text-xl text-card-foreground'>
                    <span>{project.name}</span>
                    <ArrowRight className='size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary' />
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-1 font-mono text-xs text-muted-foreground'>
                  <p>{project.path}</p>
                  <p>specs · {project.specsPath}</p>
                  <p>state · {project.statePath ?? 'tracked globally'}</p>
                </CardContent>
              </Card>
            </NextLink>
          ))}
        </div>
      )}
    </div>
  )
}
