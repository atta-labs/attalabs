'use client'

import { Heading, Text } from '@atta/ui'
import { AIACanvas, AIASphere, type AIACanvasRef, type CanvasPhase } from '@atta/ui/canvas'
import { useCallback, useEffect, useRef, useState } from 'react'
import { SignUpAction } from '@/components/SignUpAction'

type VitakkaPhase = 'thinking' | 'dissolving' | 'merged' | 'focused'

const SPHERE_CONFIGS = [
  { id: 'v1', size: 48, left: 'left-[10%]', top: 'top-[14%]' },
  { id: 'v2', size: 36, left: 'left-[85%]', top: 'top-[11%]' },
  { id: 'v3', size: 96, left: 'left-[7%]', top: 'top-[58%]' },
  { id: 'v4', size: 56, left: 'left-[88%]', top: 'top-[70%]' },
  { id: 'v5', size: 112, left: 'left-[20%]', top: 'top-[84%]' }
] as const

const MERGED_SIZE = 180
const THINKING_DURATION_MS = 5000

export function VitakkaCanvas() {
  const [phase, setPhase] = useState<VitakkaPhase>('thinking')
  const canvasRef = useRef<AIACanvasRef>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase('dissolving')
      canvasRef.current?.forceSettle()
    }, THINKING_DURATION_MS)
    return () => clearTimeout(timer)
  }, [])

  const handleCanvasPhase = useCallback((canvasPhase: CanvasPhase) => {
    if (canvasPhase !== 'settled') return
    setPhase((prev) => (prev === 'dissolving' ? 'merged' : prev))
  }, [])

  const isDissolving = phase === 'dissolving' || phase === 'merged' || phase === 'focused'
  const isFocused = phase === 'focused'
  const showFocus = phase === 'merged' || phase === 'focused'

  return (
    <AIACanvas
      ref={canvasRef}
      particleCount={250}
      className='fixed inset-0 w-full h-full bg-background z-0'
      onPhaseChange={handleCanvasPhase}
      wanderDuration={999999}
      alwaysRenderSpheres
      ambientRatio={0.6}
    >
      {/* Thinking spheres — unmount when dissolving begins */}
      {!isDissolving && (
        <div className='absolute inset-0 pointer-events-none'>
          {SPHERE_CONFIGS.map((s) => (
            <div key={s.id} className={`absolute ${s.left} ${s.top} -translate-x-1/2 -translate-y-1/2`}>
              <AIASphere id={s.id} size={s.size} state='speaking' showMatrix />
            </div>
          ))}
        </div>
      )}

      {/* Main layout */}
      <div className='relative z-10 flex min-h-dvh w-full flex-col items-center justify-center gap-4'>
        <Text as='small' className='uppercase tracking-widest text-muted-foreground'>
          vitakka.ai
        </Text>
        <Heading level={1} className='text-7xl text-foreground'>
          Vitakka
        </Heading>
        <Text as='p' className='text-lg text-foreground'>
          vitakka · from the Pāli, directed thought
        </Text>

        {/* Convergence zone */}
        <div className='relative flex h-52 w-full items-center justify-center'>
          {isDissolving && (
            <AIASphere
              id='v-merged'
              size={MERGED_SIZE}
              state={phase === 'dissolving' ? 'idle' : 'speaking'}
              showMatrix={phase !== 'dissolving'}
            >
              {showFocus && (
                <span
                  className={`relative z-[2] font-serif italic text-foreground/90 text-lg tracking-wide pointer-events-none ${isFocused ? 'opacity-100' : 'animate-[vitakka-focus-in_0.8s_ease-in-out_forwards]'}`}
                  onAnimationEnd={() => setPhase((prev) => (prev === 'merged' ? 'focused' : prev))}
                >
                  Focus.
                </span>
              )}
            </AIASphere>
          )}
        </div>

        {/* Tagline + CTA — fade in after Focus. settles */}
        <div
          className={`flex flex-col items-center gap-6 transition-opacity duration-[1500ms] ease-in-out ${isFocused ? 'opacity-100' : 'opacity-0'}`}
        >
          <Text as='p' className='text-2xl text-foreground text-center max-w-md'>
            Centralise your intelligence.
          </Text>
          <SignUpAction />
          <Text as='small' className='uppercase text-muted-foreground'>
            an atta.ai product
          </Text>
        </div>
      </div>
    </AIACanvas>
  )
}
