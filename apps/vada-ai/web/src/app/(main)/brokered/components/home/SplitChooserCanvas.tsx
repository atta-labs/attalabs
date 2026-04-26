'use client'

import { AIACanvas } from '@atta/ui/canvas'
import type { ReactNode } from 'react'
import { renderBrokeredFabric } from './fabric-brokered'

export function SplitChooserCanvas({ children }: { children?: ReactNode }) {
  return (
    <div className='pointer-events-none fixed inset-0 z-0 bg-background'>
      <AIACanvas bg={renderBrokeredFabric} wanderDuration={120} className='h-full w-full'>
        {children}
      </AIACanvas>
    </div>
  )
}
