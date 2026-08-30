import { NextLink } from '@atta/ui/lib/next-link'
import { Text } from '@atta/ui/shared'
import { ArrowRight } from 'lucide-react'
import { LetterReveal } from '../../_components/LetterReveal'
import { ButtonLink } from '../../_components/landing/ButtonLink'
import { LandingSection } from '../../_components/landing/LandingSection'
import { SectionOverline, SectionTitle } from '../../_components/landing/SectionHeading'

export function CloserSection() {
  return (
    <LandingSection id='quickstart' background='bg-card text-card-foreground' py='spacious' center>
      <SectionOverline className='text-muted-foreground'>quickstart</SectionOverline>
      <SectionTitle className='mx-auto mt-5 max-w-2xl' leading='tight'>
        <LetterReveal text='Ask for a rules file. Ship a gate.' />
      </SectionTitle>
      <Text as='p' size='lg' muted className='mx-auto mt-7 max-w-xl leading-relaxed'>
        One command installs the hooks, the CI workflow, and the starter config — diff-and-confirm, nothing silent.
      </Text>
      <div className='mt-9 flex flex-wrap justify-center gap-4'>
        <ButtonLink href='/docs/cli' className='font-mono text-xs uppercase tracking-[0.16em]'>
          npx @attalabs/vinaya quickstart
        </ButtonLink>
        <NextLink
          href='/docs/cli'
          variant='unstyled'
          className='inline-flex items-center gap-1.5 self-center text-primary text-sm underline-offset-4 hover:underline'
        >
          Read the CLI docs <ArrowRight className='size-3.5' />
        </NextLink>
      </div>
    </LandingSection>
  )
}
