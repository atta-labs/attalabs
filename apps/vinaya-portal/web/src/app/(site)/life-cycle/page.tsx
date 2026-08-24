import { Footer } from '@atta/ui/footer'
import { Heading, Text } from '@atta/ui/shared'
import type { Metadata } from 'next'
import { LetterReveal } from '../_components/LetterReveal'
import { SectionOverline, SectionTitle } from '../_components/landing/SectionHeading'
import { STAGES } from '../start/_lib/stages'
import { FramingBlock } from './_components/FramingBlock'
import { HeroStepperPreview } from './_components/HeroStepperPreview'
import { LoopComposition } from './_components/LoopComposition'
import { MarkDefs } from './_components/StageGlyph'
import { StageSection } from './_components/StageSection'
import { SwimlaneTimeline } from './_components/SwimlaneTimeline'

export const metadata: Metadata = {
  title: 'Life cycle · Vinaya',
  description: 'The cycle your dev team already runs — seven stages, enforced, in one scrolling page.'
}

/** The default lifecycle walkthrough, as one scrolling page — replaces the
 * seven thin `/start/*` stage routes (Issue #918). `MarkDefs` mounts
 * exactly once here, at page level; every `StageDiagram` and the hero's
 * `LoopComposition` `<use>` into it — the Issue's own trap ("do NOT mount
 * MarkDefs per section") is why this isn't spread across the sections that
 * need it. */
export default function LifeCyclePage() {
  return (
    <>
      <MarkDefs />

      {/* Hero — the whole-harness loop. */}
      <section className='bg-background py-16 sm:py-24 lg:py-28'>
        <div className='mx-auto flex max-w-[73.75rem] flex-col gap-10 px-6 sm:px-10'>
          <div className='flex flex-col gap-5'>
            <SectionOverline className='text-muted-foreground'>What you already run</SectionOverline>
            <SectionTitle>
              <LetterReveal text='The cycle your dev team already runs.' />
            </SectionTitle>
            <Text as='p' size='lg' muted className='max-w-2xl leading-relaxed'>
              Nothing new to learn. Vinaya adds one thing: nothing reaches the next stage until the last one passed.
            </Text>
          </div>

          <HeroStepperPreview />

          <LoopComposition />
        </div>
      </section>

      {/* Swimlane timeline — the whole tranche, once, at speed. */}
      <section className='border-border border-t bg-card py-14 sm:py-20 lg:py-24'>
        <div className='mx-auto flex max-w-[73.75rem] flex-col gap-8 px-6 sm:px-10'>
          <div className='flex flex-col gap-4'>
            <SectionOverline className='text-muted-foreground'>The whole thing · 25 seconds</SectionOverline>
            <Heading level={2} className='font-serif text-3xl font-normal leading-tight text-foreground sm:text-4xl'>
              <LetterReveal text='One tranche, start to finish.' />
            </Heading>
            <Text as='p' size='lg' muted className='max-w-2xl leading-relaxed'>
              The same seven stages below, played once at speed — so the shape is clear before the detail arrives.
            </Text>
          </div>

          <SwimlaneTimeline />
        </div>
      </section>

      <FramingBlock />

      {/* The seven stages, alternating, diagram-led. */}
      {STAGES.map((stage, index) => (
        <StageSection key={stage.id} number={index + 1} stage={stage} allStages={STAGES} />
      ))}

      <Footer
        product='vinaya'
        tagline='Execution governance for software teams'
        links={[
          { label: 'The Harness', href: '/docs/harness' },
          { label: 'Studio', href: '/the-studio' },
          { label: 'Start', href: '/start' },
          { label: 'CLI', href: '/docs/cli' },
          { label: 'Docs', href: '/docs' }
        ]}
      />
    </>
  )
}
