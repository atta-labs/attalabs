'use client'

import { cn } from '@atta/ui/lib/utils'
import { usePinEnabled } from './LandingInteractions'
import { MergeSceneCanvas } from './MergeSceneCanvas'
import { SectionTitle } from './SectionHeading'

// 04 · The result. Pinned (a 420vh runway around one sticky full-viewport stage) on a roomy
// viewport, where the merge scene reads the section's own scroll position. Below the pin gate or
// under reduced motion it is a flowing centred section and the scene shows its end state. The title
// and the mono log line are driven letter by letter by the scene (`data-letter-reveal`,
// `data-sub-reveal`).
export function HarnessDiagramSection() {
  const pinned = usePinEnabled()

  return (
    <section className={cn('relative bg-background text-foreground', pinned && 'h-[420vh]')}>
      <div className={cn('flex flex-col overflow-hidden', pinned ? 'sticky top-0 h-screen' : 'h-[max(34rem,80vh)]')}>
        <div className='flex flex-col items-center gap-[0.6rem] px-6 pt-[calc(3.5rem+clamp(0.5rem,3vh,2rem))] text-center sm:px-10'>
          <SectionTitle size='compact' letterReveal>
            Your GitHub, perfectly structured
          </SectionTitle>
          <p
            data-sub-reveal='1'
            className='inline-flex items-center gap-[0.6em] font-mono text-[clamp(1.1rem,1.9vw,1.6rem)] leading-tight tracking-[-0.01em] text-muted-foreground [clip-path:inset(-0.2em_100%_-0.2em_0)]'
          >
            <span className='text-success'>›</span>
            <span>Your process, completely logged.</span>
            <span aria-hidden='true' className='inline-block h-[1.05em] w-[0.55em] bg-current opacity-70' />
          </p>
        </div>
        <div className='relative min-h-0 flex-1'>
          <MergeSceneCanvas still={!pinned} />
        </div>
        <div className='h-[clamp(1.25rem,5vh,3rem)]' />
      </div>
    </section>
  )
}
