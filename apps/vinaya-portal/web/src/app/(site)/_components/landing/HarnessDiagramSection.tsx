'use client'

import { cn } from '@atta/ui/lib/utils'
import { SquareTerminal } from 'lucide-react'
import { useState } from 'react'
import { useReducedMotion } from './LandingInteractions'
import { MergeSceneCanvas, type SceneLog } from './MergeSceneCanvas'
import { SectionTitle } from './SectionHeading'
import { Terminal } from './Terminal'

// 04 · The result. Pinned at every width (a 420vh runway around one sticky full-viewport stage):
// the merge scene reads the section's own scroll position, so the story plays as the reader scrolls
// on a phone too, and the stage holds still long enough to read. Under reduced motion it is a
// flowing section and the scene shows its end state. The canvas runs to the bottom of the stage,
// with no strip below it that would cut the fabric off. The title and the mono log line are driven
// letter by letter by the scene (`data-letter-reveal`, `data-sub-reveal`).
export function HarnessDiagramSection() {
  const reduced = useReducedMotion()
  const pinned = !reduced
  const [log, setLog] = useState<SceneLog>({ fits: false, lines: [] })

  return (
    <section className={cn('relative bg-background text-foreground', pinned && 'h-[420vh]')}>
      <div className={cn('flex flex-col overflow-hidden', pinned ? 'sticky top-0 h-dvh' : 'h-[max(34rem,80vh)]')}>
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
        <div className='relative mt-[clamp(1.5rem,6vh,4rem)] min-h-0 flex-1'>
          <MergeSceneCanvas still={reduced} onLog={setLog} />
          <Terminal
            aria-hidden='true'
            header={
              <>
                <span className='inline-flex items-center gap-[0.45rem]'>
                  <SquareTerminal className='size-[13px]' />$ vinaya log --follow
                </span>
                <span className='inline-flex items-center gap-[0.35rem]'>
                  <i className='inline-block size-1.5 rounded-full bg-success' />
                  live
                </span>
              </>
            }
            headerClassName='text-muted-foreground'
            lines={log.lines}
            rows={4}
            className={cn(
              'pointer-events-none absolute bottom-5 left-6 w-[min(23rem,38%)] transition-opacity duration-300 motion-reduce:transition-none max-[720px]:left-4 max-[720px]:w-[min(21rem,calc(100%-2rem))]',
              log.fits ? 'opacity-100' : 'opacity-0'
            )}
          />
        </div>
      </div>
    </section>
  )
}
