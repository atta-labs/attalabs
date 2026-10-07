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
// with no strip below it that would cut the fabric off. The title and the mono subtitle are driven
// letter by letter by the scene (`data-letter-reveal`, `data-sub-reveal`) on the section's approach, so
// they are complete when it pins. The event log is always on screen at its fixed bottom-left place
// (the box is a constant six rows, narrower below 1200px so it clears the lower branch labels). The font-size
// overrides carry their own `leading-[1.7]`: the class merger drops the Terminal's line height together with the
// size it replaces, and the body height is sized in `em` for exactly six 1.7 lines, so without it the box ends
// up a row of empty space too tall; the scene feeds it one line at a time from the branch's progress.
export function HarnessDiagramSection() {
  const reduced = useReducedMotion()
  const pinned = !reduced
  const [log, setLog] = useState<SceneLog>({ lines: [] })

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
            <span>Your process, completely logged</span>
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
            rows={6}
            className='pointer-events-none absolute bottom-5 left-6 w-[min(28rem,44%)] text-[0.9rem] leading-[1.7] max-[1199px]:w-[min(19rem,30%)] max-[1199px]:text-[0.8125rem] max-[1199px]:leading-[1.7] max-[720px]:left-4 max-[720px]:w-[min(24rem,calc(100%-2rem))] max-[720px]:text-[0.8125rem] max-[720px]:leading-[1.7]'
          />
        </div>
      </div>
    </section>
  )
}
