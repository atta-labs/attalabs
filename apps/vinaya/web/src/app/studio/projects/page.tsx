import { Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'
import { readRegistry } from '@/lib/repo-state'

export const metadata: Metadata = {
  title: 'Projects · Vinaya Studio'
}

export default async function ProjectsPage() {
  const projects = await readRegistry()

  return (
    <div className='space-y-6'>
      <header className='space-y-2'>
        <h1 className='font-serif text-3xl tracking-tight text-foreground'>Projects</h1>
        <p className='font-sans text-sm text-muted-foreground'>
          Registry from <span className='font-mono'>.vinaya/projects.md</span>. Pick one to see its iterations.
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
