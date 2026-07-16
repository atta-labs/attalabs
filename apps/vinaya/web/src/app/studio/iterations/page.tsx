import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isProductionDeploy } from '@/lib/env'
import { listIterations } from '@/lib/repo-state'
import { IterationsTabs } from './IterationsTabs'

// Forge reads derive live Issue/PR state from GitHub — never serve from cache.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Iterations · Vinaya Studio'
}

export default async function IterationsPage() {
  if (isProductionDeploy()) notFound()

  const { active, archived, forge } = await listIterations()

  return (
    <div className='space-y-8'>
      <header className='space-y-2'>
        <h1 className='font-serif text-3xl tracking-tight text-foreground'>Iterations</h1>
        <p className='font-sans text-sm text-muted-foreground'>
          All iterations across every project — active from open GitHub Milestones, archived from closed ones (plus a
          small, closed legacy set from <span className='font-mono'>aeg-root/iterations/completed/</span>).
        </p>
      </header>

      <IterationsTabs active={active} archived={archived} forge={forge} />
    </div>
  )
}
