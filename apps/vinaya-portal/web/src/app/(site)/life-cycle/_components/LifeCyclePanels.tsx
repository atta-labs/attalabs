'use client'

import { Button, Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components'
import { Heading, Text } from '@atta/ui/shared'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { LetterReveal } from '../../_components/LetterReveal'
import { RevealGrid } from '../../_components/landing/LandingInteractions'
import { LandingSection } from '../../_components/landing/LandingSection'
import { SectionOverline, SectionTitle } from '../../_components/landing/SectionHeading'
import type { LifeCycleContent } from '../_lib/lifecycle-content'
import { LIFECYCLE_CONTENT } from '../_lib/lifecycle-content'
import type { LifeCycleId } from '../_lib/life-cycles'
import { LifeCycleSwitcher } from './LifeCycleSwitcher'
import { LifeCycleTimeline } from './LifeCycleTimeline'

const STAGE_BACKGROUNDS = ['bg-background text-foreground', 'bg-card text-card-foreground'] as const

function NounsGrid({ content }: { content: LifeCycleContent }) {
  return (
    <RevealGrid className='mt-10 flex flex-wrap justify-center gap-4'>
      {content.nouns.map(({ overline, title, body }, index) => (
        <Card
          key={title}
          className={`w-72 max-w-full translate-y-3.5 opacity-0 transition-all duration-500 group-data-[visible=true]/reveal:translate-y-0 group-data-[visible=true]/reveal:opacity-100 ${index % 3 === 1 ? 'delay-[90ms]' : index % 3 === 2 ? 'delay-[180ms]' : ''}`}
        >
          <CardHeader>
            <Text as='p' size='xs' muted className='font-mono uppercase tracking-widest'>
              {overline}
            </Text>
            <CardTitle className='mt-3 font-serif text-2xl font-normal leading-none'>{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <Text size='sm' muted className='leading-relaxed'>
              {body}
            </Text>
          </CardContent>
        </Card>
      ))}
    </RevealGrid>
  )
}

function StageBlock({ stage }: { stage: LifeCycleContent['stages'][number] }) {
  return (
    <div className='grid gap-10 md:grid-cols-2 md:items-start'>
      <div>
        <SectionOverline className='text-muted-foreground'>{stage.ordinal}</SectionOverline>
        <Heading level={3} weight='normal' className='mt-4 font-serif text-4xl leading-tight sm:text-5xl'>
          <LetterReveal text={stage.title} />
        </Heading>
        <Text as='p' size='lg' className='mt-5 max-w-md leading-relaxed'>
          {stage.body}
        </Text>
      </div>
      <div className='flex flex-col gap-5 md:pt-2'>
        <div className='flex items-baseline gap-5'>
          <Text as='span' size='xs' muted className='w-24 shrink-0 font-mono uppercase tracking-widest'>
            who does it
          </Text>
          <Text as='span' className={`font-serif text-2xl ${stage.whoMuted ? 'text-muted-foreground' : ''}`}>
            {stage.who}
          </Text>
        </div>
        <div className='flex items-baseline gap-5'>
          <Text as='span' size='xs' muted className='w-24 shrink-0 font-mono uppercase tracking-widest'>
            what ends it
          </Text>
          <Text as='span' className='font-serif text-2xl'>
            {stage.endsWhen}
          </Text>
        </div>
        <div className='flex items-baseline gap-5'>
          <Text as='span' size='xs' muted className='w-24 shrink-0 font-mono uppercase tracking-widest'>
            starts with
          </Text>
          <Text as='span' className='font-serif text-2xl'>
            {stage.startsWith}
          </Text>
        </div>
        <div className='flex items-baseline gap-5'>
          <Text as='span' size='xs' muted className='w-24 shrink-0 font-mono uppercase tracking-widest'>
            ends with
          </Text>
          <Text as='span' className='font-serif text-2xl'>
            {stage.endsWith}
          </Text>
        </div>
      </div>
    </div>
  )
}

function LifeCyclePanel({
  altitude,
  content,
  onChange
}: {
  altitude: LifeCycleId
  content: LifeCycleContent
  onChange: (id: LifeCycleId) => void
}) {
  // The switcher is a horizontal tab row, not a vertical hierarchy — 'down'
  // (one altitude in: milestone → tranche → task) moves right along it,
  // 'up' (back out) moves left.
  const HandoffIcon = content.handoff.direction === 'down' ? ArrowRight : ArrowLeft

  return (
    <>
      <LandingSection background='bg-card text-card-foreground' center>
        <SectionTitle className='mx-auto max-w-3xl' leading='tight'>
          <LetterReveal text={content.heading} />
        </SectionTitle>
        <Text as='p' size='lg' muted className='mx-auto mt-6 max-w-2xl leading-relaxed'>
          {content.description}
        </Text>
        <NounsGrid content={content} />
      </LandingSection>

      <LandingSection background='bg-secondary/70 text-secondary-foreground' center>
        <SectionOverline className='text-muted-foreground'>{content.timeline.overline}</SectionOverline>
        <SectionTitle className='mx-auto mt-5 max-w-3xl' leading='tight'>
          <LetterReveal text={content.timeline.title} />
        </SectionTitle>
        <Text as='p' size='lg' muted className='mx-auto mt-6 max-w-xl leading-relaxed'>
          {content.timeline.body}
        </Text>
        <div className='mt-10'>
          <LifeCycleTimeline altitude={altitude} content={content.timeline} />
        </div>
      </LandingSection>

      {content.stages.map((stage, index) => (
        <LandingSection key={stage.title} background={STAGE_BACKGROUNDS[index % 2] ?? STAGE_BACKGROUNDS[0]}>
          <StageBlock stage={stage} />
        </LandingSection>
      ))}

      <LandingSection background='bg-secondary/70 text-secondary-foreground' py='spacious' center>
        <SectionOverline className='text-muted-foreground'>{content.handoff.overline}</SectionOverline>
        <SectionTitle className='mx-auto mt-5 max-w-2xl' leading='tight'>
          <LetterReveal text={content.handoff.title} />
        </SectionTitle>
        {content.handoff.body && (
          <Text as='p' size='lg' muted className='mx-auto mt-6 max-w-xl leading-relaxed'>
            {content.handoff.body}
          </Text>
        )}
        <Button
          type='button'
          variant='outline'
          onClick={() => onChange(content.handoff.target)}
          className='mt-9 gap-3 font-mono text-xs uppercase tracking-[0.28em]'
        >
          {content.handoff.buttonLabel}
          <HandoffIcon className='size-3.5' aria-hidden />
        </Button>
      </LandingSection>
    </>
  )
}

export function LifeCyclePanels({ active, onChange }: { active: LifeCycleId; onChange: (id: LifeCycleId) => void }) {
  return (
    <div className='bg-card text-card-foreground'>
      <LifeCycleSwitcher active={active} onChange={onChange} />
      <div key={active} className='animate-in fade-in slide-in-from-bottom-2 duration-300'>
        <LifeCyclePanel altitude={active} content={LIFECYCLE_CONTENT[active]} onChange={onChange} />
      </div>
    </div>
  )
}
