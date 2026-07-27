import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isVercelDeploy } from '@/lib/env'
import { listIterations, readRegistry } from '@/lib/repo-state'
import { IterationsTabs } from './IterationsTabs'

// Forge reads derive live Issue/PR state from GitHub — never serve from cache.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Iterations · Vinaya Studio'
}

export default async function IterationsPage() {
  if (isVercelDeploy()) notFound()

  const [{ active, archived, forge }, registry] = await Promise.all([listIterations(), readRegistry()])
  // Registered project names — a board link resolves only to one of these
  // (`readProject` 404s on a retired name like `aeg`); passed to the client
  // tabs so `iterationHref` skips unregistered projects (D-087).
  const registeredProjects = registry.map((p) => p.name)

  return (
    <div className='space-y-8'>
      <header className='space-y-2'>
        <h1 className='font-serif text-3xl tracking-tight text-foreground'>Iterations</h1>
        <p className='font-sans text-sm text-muted-foreground'>
          All iterations across every project — active from open GitHub Milestones, archived from closed ones (plus a
          small, closed legacy set from <span className='font-mono'>aeg-root/iterations/completed/</span>).
        </p>
      </header>

      <IterationsTabs active={active} archived={archived} forge={forge} registeredProjects={registeredProjects} />
    </div>
  )
}
