'use client'

import { Badge, Card } from '@atta/ui/components'
import { cn } from '@atta/ui/lib/utils'
import { Check, Split } from 'lucide-react'
import { useRef } from 'react'
import { ModelOrProviderIcon } from '@/components/agents/ModelOrProviderIcon'
import { useEnterProgress } from './LandingInteractions'
import { REVIEWERS } from './reviewers'
import { SplitSection } from './SplitSection'

// 03 · The conclusion shows its work. Copy left, the result right: as the section scrolls in, the
// result builds line by line — what the models agree on, where they conflict, then the transcript
// those lines came from, and last the audit strip (an Outside Read feature, marked as such).

const AGREED = ['Rewrite only the invoicing module first', 'Keep the ledger schema as it is'] as const
const CONFLICT = ['Timeline: one quarter, or two?'] as const
const TRANSCRIPT = [
  { slot: 0, text: 'The invoicing code is the source of most incidents…' },
  { slot: 1, text: 'A full rewrite risks the ledger; scope it down…' },
  { slot: 2, text: 'Two quarters is realistic once migration is counted…' }
] as const

// how many lines are on, out of the whole build: agreed, conflict, transcript, audit
const STEPS = AGREED.length + CONFLICT.length + TRANSCRIPT.length + 1

const ITEM = 'transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none'
const IN = 'translate-x-0 opacity-100'
const OUT = '-translate-x-2 opacity-0'
const LABEL = 'font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground'

function ResultCard({ shown }: { shown: number }) {
  let step = 0
  const on = () => shown > step++

  return (
    <Card className='flex flex-col gap-5 rounded-xl border border-border bg-card p-6 text-card-foreground shadow-lg'>
      <div className='flex items-center justify-between gap-3'>
        <span className={LABEL}>result</span>
        <span className={LABEL}>reviewers + synthesis</span>
      </div>

      <div className='flex flex-col gap-2'>
        <span className={LABEL}>agreement</span>
        {AGREED.map((line) => (
          <span key={line} className={cn('flex items-start gap-2 text-base', ITEM, on() ? IN : OUT)}>
            <Check className='mt-1 size-4 shrink-0 text-success' />
            {line}
          </span>
        ))}
      </div>

      <div className='flex flex-col gap-2'>
        <span className={LABEL}>conflict</span>
        {CONFLICT.map((line) => (
          <span key={line} className={cn('flex items-start gap-2 text-base', ITEM, on() ? IN : OUT)}>
            <Split className='mt-1 size-4 shrink-0 text-warning' />
            {line}
          </span>
        ))}
      </div>

      <div className='flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3'>
        <span className={LABEL}>transcript · every word</span>
        {TRANSCRIPT.map((line) => (
          <span key={line.text} className={cn('flex items-center gap-2 font-mono text-sm', ITEM, on() ? IN : OUT)}>
            <ModelOrProviderIcon model={REVIEWERS[line.slot]?.model ?? ''} size={16} />
            <span className='truncate text-muted-foreground'>{line.text}</span>
          </span>
        ))}
      </div>

      <div className={cn('flex flex-wrap items-center gap-2', ITEM, on() ? IN : OUT)}>
        <Badge variant='outline' className='border-success/40 bg-success/10 font-mono text-success'>
          audited
        </Badge>
        <span className='font-mono text-xs uppercase tracking-[0.06em] text-muted-foreground'>
          blind critic ✓ · fact-checker ✓ · Outside Read
        </span>
      </div>
    </Card>
  )
}

export function RecordSection() {
  const ref = useRef<HTMLElement>(null)
  const progress = useEnterProgress(ref, 0.75, 0.8)
  const shown = Math.round(progress * STEPS)

  return (
    <SplitSection
      id='record'
      ref={ref}
      background='bg-secondary/40 text-foreground'
      title={['The conclusion shows its work.']}
      subtitle={[
        'Agreement and conflict, named.',
        <span key='record' className='text-muted-foreground'>
          Every word on the record.
        </span>
      ]}
      visual={<ResultCard shown={shown} />}
    >
      <div className='flex max-w-md flex-col items-center gap-2 lg:items-start'>
        <Badge variant='outline' className='font-mono uppercase'>
          Outside Read
        </Badge>
        <span className='text-lg leading-snug text-muted-foreground'>
          For high-stakes decisions: blind critique and fact-checking before delivery.
        </span>
      </div>
    </SplitSection>
  )
}
