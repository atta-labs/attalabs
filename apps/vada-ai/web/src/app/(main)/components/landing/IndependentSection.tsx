'use client'

import { Card } from '@atta/ui/components'
import { cn } from '@atta/ui/lib/utils'
import { Text } from '@atta/ui/shared'
import { useRef } from 'react'
import { useEnterProgress, useReducedMotion } from './LandingInteractions'
import { ReviewerAgent } from './ReviewerAgent'
import { REVIEWERS } from './reviewers'
import { SplitSection } from './SplitSection'

// 01 · Independent views. Clearer judgment. Copy left; right, one question and the four answers it
// got — each reviewer (`VadaAgent`, one vendor each) answering on its own. The answers arrive one
// by one as the section scrolls in; the one that disagrees is marked, and the last line names it.

const QUESTION = 'Should we rewrite the billing service?'

const ANSWERS: readonly { agrees: boolean; text: string }[] = [
  { agrees: true, text: 'Yes, start with invoicing. It causes most incidents.' },
  { agrees: true, text: 'Yes, but only invoicing. Leave the ledger alone.' },
  { agrees: true, text: 'Yes, invoicing first. Plan for two quarters.' },
  { agrees: false, text: 'No. Fix the test coverage first; a rewrite hides the real bugs.' }
]

const DELAYS = ['delay-0', 'delay-[200ms]', 'delay-[400ms]', 'delay-[600ms]'] as const
const ITEM = 'transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none'
const LABEL = 'font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground'

function AnswersVisual({ answered, summed }: { answered: boolean; summed: boolean }) {
  return (
    <div className='flex flex-col gap-3'>
      <Card className='gap-1 rounded-lg border border-border bg-card px-4 py-3 text-card-foreground shadow-none'>
        <span className={LABEL}>the question</span>
        <span className='text-lg'>{QUESTION}</span>
      </Card>

      {REVIEWERS.map((r, index) => {
        const answer = ANSWERS[index]
        if (!answer) return null
        return (
          <Card
            key={r.vendor}
            className={cn(
              'flex-row items-center gap-4 rounded-lg border bg-card px-4 py-3 text-card-foreground shadow-none',
              ITEM,
              DELAYS[index],
              answered ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
              summed && !answer.agrees ? 'border-warning' : 'border-border'
            )}
          >
            <ReviewerAgent id={`landing-independent-${r.vendor}`} vendor={r.vendor} model={r.model} />
            <div className='flex min-w-0 flex-col gap-0.5'>
              <span className={LABEL}>{r.vendor} · on its own</span>
              <span className='text-base leading-snug'>{answer.text}</span>
            </div>
          </Card>
        )
      })}

      <Text
        className={cn(
          'text-center font-mono text-sm uppercase tracking-[0.04em] lg:text-left',
          ITEM,
          'delay-[800ms]',
          summed ? 'opacity-100' : 'opacity-0'
        )}
      >
        <span className='text-success'>3 agree</span>
        <span className='text-muted-foreground'> · </span>
        <span className='text-warning'>1 disagrees: check the tests before you commit</span>
      </Text>
    </div>
  )
}

export function IndependentSection() {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const entered = useEnterProgress(ref, 0.75, 0.6)
  const progress = reduced ? 1 : entered

  return (
    <SplitSection
      id='independent'
      ref={ref}
      background='bg-secondary text-secondary-foreground'
      title={['Independent views.', 'Clearer judgment.']}
      subtitle={[
        'Several models, different vendors, each reviewing alone.',
        <span key='gap' className='text-muted-foreground'>
          Where they disagree is where the uncertainty is.
        </span>
      ]}
      visual={<AnswersVisual answered={progress > 0.3} summed={progress > 0.8} />}
    />
  )
}
