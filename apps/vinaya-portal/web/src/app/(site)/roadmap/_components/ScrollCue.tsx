'use client'

import { useEffect, useRef } from 'react'
import { attach, getRest, subscribe } from '../_lib/rest-signal'

// The roadmap's "SCROLL" cue — the same look as the landing hero's (`data-hero-descend`
// in `hero-canvas/VinayaHeroEmblem.tsx`: a mono label over three shortening lines),
// copied here rather than imported so the hero stays untouched. Fixed to the viewport's
// bottom edge. Its opacity is the shared `rest` value (`_lib/rest-signal.ts`): 1 at the
// top, fading to 0 over 500ms once the pad screen's success line has been held, and back
// to 1 over 400ms on return to the top. Written imperatively (`style.opacity`, the
// carve-out for a runtime-computed value).
export function ScrollCue() {
  const cueRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cue = cueRef.current
    if (!cue) return
    const detach = attach(cue)
    const apply = (rest: number) => {
      cue.style.opacity = rest.toFixed(3)
    }
    apply(getRest())
    const unsubscribe = subscribe((e) => apply(e.rest))
    return () => {
      unsubscribe()
      detach()
    }
  }, [])

  return (
    <div
      ref={cueRef}
      aria-hidden
      className='pointer-events-none fixed bottom-[clamp(1.5rem,5vh,3rem)] left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2.5'
    >
      <span className='font-mono text-[0.6875rem] uppercase tracking-[0.28em] text-muted-foreground'>Scroll</span>
      <span className='flex flex-col items-center gap-[0.1667rem]'>
        <span className='block h-px w-[1.8889rem] bg-foreground' />
        <span className='block h-px w-[1.2222rem] bg-foreground/55' />
        <span className='block h-px w-[0.6667rem] bg-foreground/30' />
      </span>
    </div>
  )
}
