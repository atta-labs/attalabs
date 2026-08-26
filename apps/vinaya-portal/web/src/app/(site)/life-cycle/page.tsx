import { Footer } from '@atta/ui/footer'
import { NextLink } from '@atta/ui/lib/next-link'
import { Text } from '@atta/ui/shared'
import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'
import { LetterReveal } from '../_components/LetterReveal'
import { ButtonLink } from '../_components/landing/ButtonLink'
import { LandingSection } from '../_components/landing/LandingSection'
import { SectionOverline, SectionTitle } from '../_components/landing/SectionHeading'
import { LifeCyclePanels } from './_components/LifeCyclePanels'
import { LifeCycleWordFlow } from './_components/LifeCycleWordFlow'
import { CLOSING_CONTENT, HERO_CONTENT } from './_lib/lifecycle-content'

export const metadata: Metadata = {
  title: 'Life cycle · Vinaya',
  description: 'Three altitudes, one shape — milestone, tranche, and task, each enforced the same way.'
}

export default function LifeCyclePage() {
  return (
    <>
      {/* min-h-svh: the hero fills the viewport, so the panels section (and
          its switcher) genuinely requires a scroll to reach — it must never
          just sit pre-visible below a short hero with no interaction. */}
      <LandingSection
        background='bg-background text-foreground'
        py='spacious'
        center
        className='flex min-h-svh flex-col justify-center'
      >
        <SectionOverline className='text-muted-foreground'>{HERO_CONTENT.overline}</SectionOverline>
        <SectionTitle className='mx-auto mt-5 max-w-4xl text-5xl sm:text-6xl lg:text-7xl'>
          <LetterReveal text={HERO_CONTENT.title} />
        </SectionTitle>
        <div className='mx-auto mt-7 flex max-w-xl justify-center gap-3.5'>
          {HERO_CONTENT.words.map((word, index) => (
            <span key={word} className='flex items-center gap-3.5'>
              {index > 0 && (
                <Text as='span' size='lg' muted className='font-mono uppercase tracking-[0.28em]'>
                  ·
                </Text>
              )}
              <Text as='span' size='lg' className='font-mono uppercase tracking-[0.28em]'>
                {word}
              </Text>
            </span>
          ))}
        </div>
        <div className='mt-12'>
          <LifeCycleWordFlow />
        </div>
      </LandingSection>

      <LifeCyclePanels />

      <LandingSection background='bg-background text-foreground' py='spacious' center>
        <SectionOverline className='text-muted-foreground'>{CLOSING_CONTENT.overline}</SectionOverline>
        <SectionTitle className='mx-auto mt-5 max-w-2xl' leading='tight'>
          <LetterReveal text={CLOSING_CONTENT.title} />
        </SectionTitle>
        <Text as='p' size='lg' muted className='mx-auto mt-7 max-w-xl leading-relaxed'>
          {CLOSING_CONTENT.body}
        </Text>
        <div className='mt-9 flex flex-wrap justify-center gap-4'>
          <ButtonLink href={CLOSING_CONTENT.primary.href} className='font-mono text-xs uppercase tracking-[0.16em]'>
            {CLOSING_CONTENT.primary.label}
          </ButtonLink>
          <NextLink
            href={CLOSING_CONTENT.secondary.href}
            variant='unstyled'
            className='inline-flex items-center gap-1.5 self-center text-primary text-sm underline-offset-4 hover:underline'
          >
            {CLOSING_CONTENT.secondary.label} <ArrowRight className='size-3.5' />
          </NextLink>
        </div>
      </LandingSection>

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
