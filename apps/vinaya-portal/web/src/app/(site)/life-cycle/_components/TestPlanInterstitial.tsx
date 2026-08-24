'use client'

import { Badge, Checkbox } from '@atta/ui/components'
import { Heading, Text } from '@atta/ui/shared'
import { useState } from 'react'
import { LetterReveal } from '../../_components/LetterReveal'
import { SectionOverline } from '../../_components/landing/SectionHeading'

type PlanItem = { tag: '[agent]' | '[principal]'; label: string }

const ITEMS: PlanItem[] = [
  { tag: '[agent]', label: 'route returns `200` against fixture' },
  { tag: '[agent]', label: 'unit suite green on branch' },
  { tag: '[agent]', label: 'evidence comment posted' },
  { tag: '[principal]', label: 'renders correctly in dark mode' },
  { tag: '[principal]', label: 'auth-gated flow completes end to end' }
]

/** The interstitial beat between Security and Archive — a phase, not a
 * role, so it is its own short section rather than one of the seven
 * numbered stages. The checklist is illustrative: clicking the two
 * `[principal]` rows demonstrates the split test plan's concept, it does
 * not gate this marketing page (Issue #918 §2). */
export function TestPlanInterstitial() {
  const [principalTicked, setPrincipalTicked] = useState([false, false])
  const blocked = principalTicked.filter((ticked) => !ticked).length

  return (
    <section className='border-border border-t bg-card py-14 sm:py-20 lg:py-24'>
      <div className='mx-auto flex max-w-[73.75rem] flex-col gap-8 px-6 sm:px-10'>
        <SectionOverline className='text-muted-foreground'>
          Between Security and Archive · a phase, not a role
        </SectionOverline>
        <Heading level={3} className='font-serif text-2xl font-normal leading-tight text-foreground sm:text-3xl'>
          <LetterReveal text='CI green ≠ app boots ≠ feature works.' />
        </Heading>
        <Text as='p' size='lg' muted className='max-w-2xl leading-relaxed'>
          Every brief carries a test plan, split by who can actually run each item. The agent proves what is scriptable.
          A human proves what needs eyes.
        </Text>
        <Text as='p' size='sm' muted className='max-w-2xl leading-relaxed'>
          <span className='font-mono font-medium text-foreground'>[principal]</span> — a human. The person who owns the
          call, and the only one who can waive a gate.
        </Text>

        <div className='flex flex-col gap-4 rounded-lg border border-border bg-background p-6'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <Text as='span' size='xs' muted className='font-mono uppercase tracking-widest'>
              Test plan — on the pull request
            </Text>
            <Badge variant={blocked > 0 ? 'destructive' : 'outline'}>
              {blocked > 0 ? `MERGE BLOCKED — ${blocked} ITEM${blocked === 1 ? '' : 'S'}` : 'MERGE READY'}
            </Badge>
          </div>

          <ul className='flex flex-col gap-3'>
            {ITEMS.map((item, index) => {
              const isAgent = item.tag === '[agent]'
              const principalIndex = index - 3
              const checked = isAgent ? true : (principalTicked[principalIndex] ?? false)
              return (
                <li key={item.label} className='flex items-center gap-3'>
                  <Checkbox
                    checked={checked}
                    disabled={isAgent}
                    onCheckedChange={(value) => {
                      if (isAgent) return
                      setPrincipalTicked((prev) =>
                        prev.map((ticked, i) => (i === principalIndex ? Boolean(value) : ticked))
                      )
                    }}
                  />
                  <Text as='span' size='xs' className='font-mono uppercase tracking-widest text-muted-foreground'>
                    {item.tag}
                  </Text>
                  <Text as='span' size='sm' className='text-foreground'>
                    {item.label}
                  </Text>
                </li>
              )
            })}
          </ul>

          <Text as='span' size='xs' muted className='font-mono uppercase tracking-widest'>
            The two [principal] rows are yours — click to tick
          </Text>
        </div>
      </div>
    </section>
  )
}
