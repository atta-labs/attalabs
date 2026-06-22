import type { Metadata } from 'next'
import { listIterations } from '@/lib/aeg-fs'
import { IterationsTabs } from './IterationsTabs'

export const metadata: Metadata = {
  title: 'Iterations · AEG Studio'
}

export default async function IterationsPage() {
  const { active, archived } = await listIterations()

  return (
    <div className='space-y-8'>
      <header className='space-y-2'>
        <h1 className='font-serif text-3xl tracking-tight text-foreground'>Iterations</h1>
        <p className='font-sans text-sm text-muted-foreground'>
          All iterations across every project, from <span className='font-mono'>aeg-root/iterations/</span>.
        </p>
      </header>

      <IterationsTabs active={active} archived={archived} />
    </div>
  )
}
