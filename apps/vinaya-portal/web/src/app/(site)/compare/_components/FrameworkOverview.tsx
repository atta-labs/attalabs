import { NextLink } from '@atta/ui/lib/next-link'
import { cn } from '@atta/ui/lib/utils'
import { Text } from '@atta/ui/shared'
import { RevealGrid } from '../../_components/landing/LandingInteractions'
import { LandingSection } from '../../_components/landing/LandingSection'
import { SectionOverline, SectionTitle } from '../../_components/landing/SectionHeading'
import { FRAMEWORKS, INCLUSION_THRESHOLD_STARS, REVIEW_DATE } from '../_lib/comparison-data'

const HEADER_ROW = 'grid gap-6 border-b border-border px-4 py-3 md:grid-cols-[minmax(10rem,15rem)_6rem_7rem_1fr]'
const ROW =
  'grid items-baseline gap-6 border-b border-border px-4 py-6 md:grid-cols-[minmax(10rem,15rem)_6rem_7rem_1fr]'

export function FrameworkOverview() {
  return (
    <LandingSection id='frameworks' background='bg-card text-card-foreground'>
      <SectionOverline className='text-center text-muted-foreground'>the open-source market</SectionOverline>
      <SectionTitle className='mt-4 text-center' leading='tight'>
        Five frameworks, one comparison
      </SectionTitle>

      <div className='mt-8 grid gap-10 md:grid-cols-2'>
        <blockquote className='border-l-4 border-border pl-6'>
          <Text className='leading-relaxed text-muted-foreground'>
            This comparison covers active open-source frameworks for AI-assisted software development with at least{' '}
            {INCLUSION_THRESHOLD_STARS.toLocaleString('en-US')} GitHub stars, reviewed {REVIEW_DATE}. Stars select the
            comparison set; they do not measure product quality. Core distributions are evaluated separately from
            extensions.
          </Text>
        </blockquote>
        <Text as='p' className='text-sm leading-relaxed text-muted-foreground/80'>
          A note on runtime automation: GitHub’s own Agentic Workflows (gh-aw) can require a workflow run to pass, but
          it’s a CI-automation product, not a development-methodology framework — mentioned for context, not scored
          below.
        </Text>
      </div>

      <div className='mt-10'>
        <div className={cn(HEADER_ROW, 'font-mono text-[0.625rem] uppercase tracking-[0.16em] text-muted-foreground')}>
          <span>Framework</span>
          <span>Stars</span>
          <span>License</span>
          <span>Primary strength</span>
        </div>
        <RevealGrid>
          {FRAMEWORKS.map((fw, index) => (
            <div
              key={fw.key}
              className={cn(
                ROW,
                fw.highlight && 'bg-primary/5 shadow-[inset_3px_0_0_var(--primary)]',
                'translate-y-3.5 opacity-0 transition-all duration-500 group-data-[visible=true]/reveal:translate-y-0 group-data-[visible=true]/reveal:opacity-100',
                index % 3 === 1 && 'delay-[90ms]',
                index % 3 === 2 && 'delay-[180ms]'
              )}
            >
              <NextLink
                href={fw.repoUrl}
                variant='unstyled'
                target='_blank'
                rel='noreferrer'
                className={cn(
                  'font-serif text-2xl tracking-tight underline-offset-4 hover:underline',
                  fw.highlight ? 'font-semibold text-primary' : 'text-foreground'
                )}
              >
                {fw.name}
              </NextLink>
              <Text as='span' className='font-mono text-sm text-muted-foreground'>
                {fw.highlight ? '—' : fw.stars.toLocaleString('en-US')}
              </Text>
              <Text as='span' className='font-mono text-sm text-muted-foreground'>
                {fw.license}
              </Text>
              <Text as='span' className='text-sm leading-relaxed text-muted-foreground'>
                {fw.primaryStrength}
              </Text>
            </div>
          ))}
        </RevealGrid>
      </div>
    </LandingSection>
  )
}
