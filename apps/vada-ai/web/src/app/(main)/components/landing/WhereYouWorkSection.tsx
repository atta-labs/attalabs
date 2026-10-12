'use client'

import { Card } from '@atta/ui/components'
import { cn } from '@atta/ui/lib/utils'
import { SquareTerminal } from 'lucide-react'
import { useRef } from 'react'
import { DeliberateAction } from '../home/DeliberateAction'
import { useEnterProgress } from './LandingInteractions'
import { SplitSection } from './SplitSection'
import { UnderlineLink } from './UnderlineLink'

// 04 · Use Vāda where you work. The terminal left, the copy and the calls to action right. As the
// section scrolls in, an assistant session plays out: the ask, the `vada__deliberate` call, then
// the structured answer streaming back line by line.

type Line = { kind: 'prompt' | 'call' | 'result'; text: string }

const SESSION: readonly Line[] = [
  { kind: 'prompt', text: 'Ask Vāda: should we rewrite the billing service?' },
  { kind: 'call', text: 'vada__deliberate(spec_id: "vada-reviewers-synthesis")' },
  { kind: 'result', text: '3 reviewers · anthropic, openai, google' },
  { kind: 'result', text: 'consensus: rewrite invoicing first' },
  { kind: 'result', text: 'conflict: one quarter or two' },
  { kind: 'result', text: 'transcript: vada.attalabs.dev/deliberation/…' }
]

const PREFIX: Record<Line['kind'], string> = { prompt: '>', call: '⏺', result: '⎿' }

function SessionTerminal({ progress }: { progress: number }) {
  // the line being typed, and how much of it is on screen
  const position = progress * SESSION.length
  const current = Math.min(SESSION.length - 1, Math.floor(position))

  return (
    <Card className='gap-0 overflow-hidden rounded-xl border border-border bg-card p-0 text-card-foreground shadow-lg'>
      <div className='flex items-center gap-2 border-b border-border px-4 py-2.5 font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground'>
        <SquareTerminal className='size-3.5' />
        your assistant · mcp
      </div>
      <div className='flex min-h-[15rem] flex-col gap-2 p-5 font-mono text-sm leading-relaxed'>
        {SESSION.map((line, index) => {
          if (index > current) return null
          const typed = index < current ? 1 : Math.min(1, position - current)
          const chars = Math.ceil(line.text.length * typed)
          return (
            <div
              key={line.text}
              className={cn(
                'flex gap-2',
                line.kind === 'result' ? 'pl-4 text-muted-foreground' : 'text-card-foreground'
              )}
            >
              <span className={line.kind === 'call' ? 'text-success' : 'text-muted-foreground'}>
                {PREFIX[line.kind]}
              </span>
              <span className='min-w-0 break-words'>
                {line.text.slice(0, chars)}
                {index === current && typed < 1 && (
                  <span
                    aria-hidden='true'
                    className='ml-0.5 inline-block h-[1em] w-[0.5em] translate-y-[0.15em] bg-current opacity-70'
                  />
                )}
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export function WhereYouWorkSection() {
  const ref = useRef<HTMLElement>(null)
  const progress = useEnterProgress(ref, 0.8, 0.9)

  return (
    <SplitSection
      id='where-you-work'
      ref={ref}
      background='bg-background text-foreground'
      reverse
      fill={false}
      title={['Use Vāda where you work.']}
      subtitle={['One tool call from Claude, Cursor or any MCP client.']}
      visual={<SessionTerminal progress={progress} />}
    >
      <div className='flex flex-wrap items-center justify-center gap-6 lg:justify-start'>
        <DeliberateAction label='Open the web app' variant='default' />
        <UnderlineLink href='/mcp'>Set up MCP</UnderlineLink>
      </div>
    </SplitSection>
  )
}
