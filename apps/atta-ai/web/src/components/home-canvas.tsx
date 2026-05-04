'use client'

import { AIACanvas, AIASphere } from '@atta/ui/canvas'

export function HomeCanvas() {
  return (
    <AIACanvas
      bg='fabric'
      wanderDuration={120}
      alwaysRenderSpheres
      className='pointer-events-none fixed inset-0 z-0 bg-background'
    >
      <div className='flex h-screen items-center justify-center'>
        <AIASphere id='atta-home' size='xl' color='var(--primary)' state='idle' showMatrix matrixOpacity={0.08} />
      </div>
    </AIACanvas>
  )
}
