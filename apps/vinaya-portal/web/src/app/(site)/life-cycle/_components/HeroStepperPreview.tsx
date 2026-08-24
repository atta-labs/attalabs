'use client'

import { Text } from '@atta/ui/shared'
import { cn } from '@atta/ui/lib/utils'
import { useEffect, useState } from 'react'
import { STAGES } from '../../start/_lib/stages'
import { STAGE_STEPPER_SUBLINE } from '../_lib/stage-content'

const STEP_MS = 2200

/** A condensed, cycling preview of the seven stages — sits inside the hero,
 * ahead of the full swimlane timeline below it. Deliberately minimal per
 * Issue #918 §2 ("not separately load-bearing"): one label, one sub-line,
 * a 7-dot progress indicator, no diagram. */
export function HeroStepperPreview() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const interval = window.setInterval(() => setIndex((i) => (i + 1) % STAGES.length), STEP_MS)
    return () => window.clearInterval(interval)
  }, [])

  const stage = STAGES[index]
  if (!stage) return null

  return (
    <div className='flex w-full max-w-sm flex-col gap-3 rounded-lg border border-border bg-card p-5'>
      <Text as='span' size='xs' muted className='font-mono uppercase tracking-widest'>
        Vinaya's life cycle
      </Text>

      <div className='flex flex-col gap-1'>
        <Text as='span' className='font-serif text-2xl font-normal text-foreground'>
          {stage.label}
        </Text>
        <Text as='span' size='xs' muted className='font-mono uppercase tracking-widest'>
          {STAGE_STEPPER_SUBLINE[stage.id]}
        </Text>
      </div>

      <div className='flex items-center gap-1.5' aria-hidden>
        {STAGES.map((s, i) => (
          <span key={s.id} className={cn('h-1.5 flex-1 rounded-full', i === index ? 'bg-primary' : 'bg-muted')} />
        ))}
      </div>

      <Text as='span' size='xs' muted className='font-mono uppercase tracking-widest'>
        Seven stages · after the ticket, before the merge
      </Text>
    </div>
  )
}
