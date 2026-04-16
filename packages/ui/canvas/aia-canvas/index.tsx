'use client'

import type { ReactNode } from 'react'
import { AIAContext, type AIACanvasConfig, type AIACanvasRef, useAIACanvas } from './use-aia-canvas'

export type { AIACanvasRef }

interface AIACanvasProps extends AIACanvasConfig {
  children: ReactNode
  className?: string
  ref?: React.Ref<AIACanvasRef>
}

export function AIACanvas({
  children,
  className,
  bg,
  onPhaseChange,
  onSphereAbsorb,
  onOriginComplete,
  wanderDuration,
  alwaysRenderSpheres,
  matchContentHeight,
  autoTriggerGravity,
  ref
}: AIACanvasProps) {
  const { containerRef, canvasRef, contextValue } = useAIACanvas(
    { bg, onPhaseChange, onSphereAbsorb, onOriginComplete, wanderDuration, alwaysRenderSpheres, matchContentHeight, autoTriggerGravity },
    ref
  )

  return (
    <AIAContext.Provider value={contextValue}>
      <div ref={containerRef} className={`relative w-full ${className ?? ''}`}>
        <canvas ref={canvasRef} className='absolute inset-0 z-0 pointer-events-none overflow-hidden' />
        <div className='relative z-[1]'>{children}</div>
      </div>
    </AIAContext.Provider>
  )
}
