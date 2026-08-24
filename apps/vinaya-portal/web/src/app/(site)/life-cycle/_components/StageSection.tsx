import { Badge, Card, CardContent } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Heading, Text } from '@atta/ui/shared'
import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { LetterReveal } from '../../_components/LetterReveal'
import type { Stage } from '../../start/_lib/stages'
import { roleLabel, STAGE_CONTRACT_TARGET, STAGE_COPY, STAGE_FLOW } from '../_lib/stage-content'
import { NOUNS, STAGE_IN_OUT, StageDiagram } from './StageGlyph'

export type StageSectionProps = {
  /** 1-indexed position in the seven-stage sequence — drives the number
   * badge and the left/right alternation (odd = diagram left, even =
   * diagram right). */
  number: number
  stage: Stage
  /** All seven stages, keyed for `STAGE_CONTRACT_TARGET` lookups — the
   * contract-edge label needs the TARGET stage's role too. */
  allStages: readonly Stage[]
  /** Develop's refusal transcript; nothing else uses this slot. Rendered
   * full-width below the section's two-column content. */
  extra?: ReactNode
}

function FlowNoun({ noun, label }: { noun: keyof typeof NOUNS; label: 'IN' | 'OUT' }) {
  const data = NOUNS[noun]
  return (
    <div className='flex flex-col gap-1'>
      <Text as='span' size='xs' muted className='font-mono uppercase tracking-widest'>
        {label}
      </Text>
      <Text as='span' size='sm' className='font-medium text-foreground'>
        {data.label}
      </Text>
      <Text as='span' size='xs' muted className='leading-relaxed'>
        {data.description}
      </Text>
    </div>
  )
}

export function StageSection({ number, stage, allStages, extra }: StageSectionProps) {
  const copy = STAGE_COPY[stage.id]
  const flow = STAGE_FLOW[stage.id]
  const contractTargetId = STAGE_CONTRACT_TARGET[stage.id]
  const contractTarget = contractTargetId ? allStages.find((candidate) => candidate.id === contractTargetId) : null
  const diagramFirst = number % 2 === 1

  return (
    <section id={stage.id} className='border-border border-t bg-background py-14 sm:py-20 lg:py-24'>
      <div className='mx-auto flex max-w-[73.75rem] flex-col gap-10 px-6 sm:px-10'>
        <div className='grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16'>
          <div className={diagramFirst ? 'lg:order-1' : 'lg:order-2'}>
            <Card>
              <CardContent>
                <StageDiagram stageId={stage.id} className='h-auto w-full' />
              </CardContent>
            </Card>
          </div>

          <div className={diagramFirst ? 'flex flex-col gap-5 lg:order-2' : 'flex flex-col gap-5 lg:order-1'}>
            <div className='flex flex-wrap items-center gap-3'>
              <Text as='span' className='font-mono text-sm text-muted-foreground'>
                {String(number).padStart(2, '0')}
              </Text>
              <Text as='span' className='font-mono text-sm font-bold uppercase tracking-widest text-foreground'>
                {stage.label}
              </Text>
              <Badge variant='outline'>{roleLabel(stage.role).toUpperCase()}</Badge>
              <Badge variant='outline'>RING {copy.ring}</Badge>
              <Badge variant='outline'>{copy.object.toUpperCase()}</Badge>
            </div>

            <Text as='span' size='sm' muted className='font-mono uppercase tracking-widest'>
              You call it {copy.youCallIt}
            </Text>

            <Heading level={3} className='font-serif text-2xl font-normal leading-tight text-foreground sm:text-3xl'>
              <LetterReveal text={copy.headline} />
            </Heading>

            <Text as='p' muted className='leading-relaxed'>
              {STAGE_IN_OUT[stage.id]}
            </Text>

            <Text as='p' size='sm' className='leading-relaxed text-foreground'>
              Receives {stage.receives} — produces {stage.produces}.
            </Text>

            <ul className='flex flex-col gap-3'>
              {copy.bullets.map((bullet) => (
                <li key={bullet.title} className='flex flex-col gap-1'>
                  <Text as='span' size='sm' className='font-semibold text-foreground'>
                    {bullet.title}
                  </Text>
                  <Text as='span' size='sm' muted className='leading-relaxed'>
                    {bullet.body}
                  </Text>
                </li>
              ))}
            </ul>

            <NextLink
              href={`/docs/roles/${stage.role}`}
              variant='unstyled'
              className='inline-flex w-fit items-center gap-1.5 text-primary text-sm underline-offset-4 hover:underline'
            >
              <span>Read more → /docs/roles/{stage.role}</span>
              <ArrowRight className='size-3.5' />
            </NextLink>
          </div>
        </div>

        {extra}

        <div className='flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card px-5 py-4'>
          <FlowNoun noun={flow.in} label='IN' />
          <ArrowRight className='size-4 shrink-0 text-muted-foreground' aria-hidden />
          {copy.noContract ? (
            <Text as='span' size='xs' muted className='font-mono uppercase tracking-widest'>
              no contract — same PR, at the same time
            </Text>
          ) : (
            <Text as='span' size='xs' muted className='font-mono uppercase tracking-widest'>
              contract: {roleLabel(stage.role)} → {contractTarget ? roleLabel(contractTarget.role) : ''}
            </Text>
          )}
          <ArrowRight className='size-4 shrink-0 text-muted-foreground' aria-hidden />
          <FlowNoun noun={flow.out} label='OUT' />
        </div>
      </div>
    </section>
  )
}
