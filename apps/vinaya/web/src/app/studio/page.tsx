import { redirect } from 'next/navigation'
import { isProductionDeploy } from '@/lib/env'

export default function HomePage() {
  if (isProductionDeploy()) {
    redirect('/the-studio')
  }

  return (
    <div className='space-y-6'>
      <h1 className='font-serif text-3xl tracking-tight text-foreground'>Vinaya Studio</h1>
      <p className='font-sans text-base text-muted-foreground'>
        Local governance for Vinaya artifacts. Pick a section from the top bar to begin.
      </p>
      <p className='font-mono text-xs text-muted-foreground/70'>Shell scaffold · pages arrive in later tasks.</p>
    </div>
  )
}
