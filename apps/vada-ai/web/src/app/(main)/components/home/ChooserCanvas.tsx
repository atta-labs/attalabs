'use client'

import { AIACanvas } from '@atta/ui/canvas'
import { type ReactNode, useRef } from 'react'
import { ChooserScene } from './ChooserScene'
import { renderHomeFabric } from './fabric-home'

export function ChooserCanvas({ children }: { children?: ReactNode }) {
  const onOriginCompleteRef = useRef<(() => void) | null>(null)

  return (
    <div className='pointer-events-none fixed inset-0 z-0 bg-background'>
      <AIACanvas
        bg={renderHomeFabric}
        wanderDuration={1}
        alwaysRenderSpheres
        autoTriggerGravity={false}
        onOriginComplete={() => onOriginCompleteRef.current?.()}
        className='h-full w-full'
      >
        <ChooserScene onOriginCompleteRef={onOriginCompleteRef}>{children}</ChooserScene>
      </AIACanvas>
    </div>
  )
}
