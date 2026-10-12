'use client'

import { Heading, Text } from '@atta/ui/shared'
import { type ReactNode, useRef } from 'react'
import { useUserPreferences } from '@/lib/user-preferences-context'
import { useHeroScene } from './fabric/HeroFabric3D'
import { useHeroScrolled, useRingSequence } from './useHomeCanvas'

interface HomeCanvasProps {
  // The opening title, absolutely positioned over the hero viewport (Vinaya's distribution).
  // `scrolled` turns true once the camera starts to tip.
  renderTop: (state: { scrolled: boolean }) => ReactNode
}

// Vinaya's hero shape: a tall scroll track with a sticky viewport inside it. One WebGL scene
// paints the viewport — fabric, floaters, the driver and its ring of agents — and the camera
// tips from top-down toward the horizon as you scroll, while the headline scrubs in and the
// deliberation plays out (question out, answers back, converge, conclude).
export function HomeCanvas({ renderTop }: HomeCanvasProps) {
  const trackRef = useRef<HTMLElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const labelsRef = useRef<HTMLDivElement>(null)
  const { faceStyle } = useUserPreferences()
  const { revealedCount } = useRingSequence()
  const scrolled = useHeroScrolled()
  useHeroScene({
    canvasRef,
    rootRef: viewportRef,
    trackRef,
    labelsRef,
    faceStyle,
    revealed: revealedCount
  })

  return (
    <section id='hero' ref={trackRef} data-hero-track className='relative h-[320vh] w-full'>
      <div
        ref={viewportRef}
        data-hero-viewport
        className='sticky top-0 h-dvh w-full overflow-hidden bg-background [--hero-core-card:var(--card)] [--hero-core-deep:var(--primary)] [--hero-core-shade:var(--secondary)] [--hero-fabric-alpha:0.08] [--hero-fabric-ink:var(--foreground)] dark:[--hero-core-deep:color-mix(in_oklch,var(--card),var(--primary)_40%)] dark:[--hero-core-shade:color-mix(in_oklch,var(--card),var(--primary)_18%)] dark:[--hero-fabric-alpha:0.12]'
      >
        <canvas ref={canvasRef} className='absolute inset-0 z-0 block h-full w-full' />
        {/* role names under the agents and the driver's caption, pinned by the scene each frame */}
        <div ref={labelsRef} aria-hidden className='pointer-events-none absolute inset-0 z-1' />

        {/* headline + sub: hidden at scroll 0, revealed a letter at a time as you scroll */}
        <div className='pointer-events-none absolute inset-x-0 top-0 z-2 flex h-[52%] flex-col items-center justify-center gap-2 px-6 text-center'>
          <Heading
            level={1}
            weight='normal'
            className='m-0 text-balance font-serif text-[clamp(1.875rem,5.4vw,4rem)] leading-none tracking-tight text-foreground'
          >
            <span data-hero-h1a data-text='The room outperforms' />
            <br />
            <span data-hero-h1b data-text='the individual' />
          </Heading>
          <Text className='m-0 mt-3.5 text-balance font-sans text-2xl leading-snug tracking-tight text-muted-foreground sm:text-[1.75rem]'>
            <span data-hero-sub data-text='Bring a question. A team of AI models debates it.' />
          </Text>
        </div>

        <div className='pointer-events-none absolute inset-0 z-3'>{renderTop({ scrolled })}</div>
      </div>
    </section>
  )
}
