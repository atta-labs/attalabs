'use client'

import { AIACanvas, renderSplitFabricBg } from '@atta/ui/canvas'
import { BrokeredScene } from './BrokeredScene'

export function SplitChooserCanvas() {
  return (
    <div className='pointer-events-none fixed inset-0 z-0 bg-background'>
      <AIACanvas bg={renderSplitFabricBg} wanderDuration={120} className='h-full w-full'>
        <BrokeredScene />
      </AIACanvas>
    </div>
  )
}
