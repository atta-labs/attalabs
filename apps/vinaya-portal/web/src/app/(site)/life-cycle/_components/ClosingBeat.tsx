import { Code } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Heading, Text } from '@atta/ui/shared'
import { ArrowRight } from 'lucide-react'
import { LetterReveal } from '../../_components/LetterReveal'
import { SectionOverline, SectionTitle } from '../../_components/landing/SectionHeading'

const CONTRACT_CHAIN =
  'planner → brief · brief → developer · developer → reviewer · reviewer → archivist · archivist → tranche archivist · tranche archivist → planner'

/** `/docs/(with-sidebar)/config/page.tsx` did not exist at pre-flight time
 * (checked 2026-08-24, before Issue #915's nav/config-move task had
 * merged) — so the closing beat's config link points at the live `/config`
 * route, per the brief's `[DEVELOPER DECIDES]` fallback. Update to
 * `/docs/config` once that task lands. */
const CONFIG_HREF = '/config'

/** "Where it ends" + the ADD/SEE configure beat + the final CTA — the
 * page's last three beats, verbatim copy from Issue #918 §2. */
export function ClosingBeat() {
  return (
    <>
      <section className='border-border border-t bg-background py-14 sm:py-20 lg:py-24'>
        <div className='mx-auto flex max-w-[73.75rem] flex-col gap-6 px-6 sm:px-10'>
          <Heading level={2} className='font-serif text-3xl font-normal leading-tight text-foreground sm:text-4xl'>
            <LetterReveal text='The retro feeds the next planning.' />
          </Heading>
          <Text as='p' size='lg' muted className='max-w-2xl leading-relaxed'>
            Exactly as it always has. The difference is that now every turn is documented before the next one starts.
          </Text>
          <Code className='w-fit whitespace-normal break-words'>{CONTRACT_CHAIN}</Code>
          <NextLink
            href='/docs/contracts'
            variant='unstyled'
            className='inline-flex w-fit items-center gap-1.5 text-primary text-sm underline-offset-4 hover:underline'
          >
            <span>Every seam, written out</span>
            <ArrowRight className='size-3.5' />
          </NextLink>
        </div>
      </section>

      <section className='border-border border-t bg-card py-14 sm:py-20 lg:py-24'>
        <div className='mx-auto flex max-w-[73.75rem] flex-col gap-10 px-6 sm:px-10'>
          <div className='grid gap-10 sm:grid-cols-2'>
            <div className='flex flex-col gap-2'>
              <Text as='p' className='font-medium text-foreground'>
                Add — a check on any stage above.
              </Text>
              <Text as='p' size='sm' muted className='leading-relaxed'>
                Register it and it runs where ours run — on the machine before the commit, and in CI before the merge.
              </Text>
            </div>
            <div className='flex flex-col gap-2'>
              <Text as='p' className='font-medium text-foreground'>
                See — the whole set, resolved.
              </Text>
              <Text as='p' size='sm' muted className='leading-relaxed'>
                <Code>vinaya check --plan</Code> prints every check that will run against this repo, where each one came
                from, and what it can see.
              </Text>
            </div>
          </div>

          <div className='flex flex-col gap-3'>
            <Code className='w-fit'>$ vinaya check --plan</Code>
            <Text as='span' size='xs' muted className='font-mono uppercase tracking-widest'>
              The full reference
            </Text>
            <div className='flex flex-wrap gap-4'>
              <NextLink
                href='/docs/cli'
                variant='unstyled'
                className='inline-flex items-center gap-1.5 text-primary text-sm underline-offset-4 hover:underline'
              >
                Registering a check → /docs/cli
              </NextLink>
              <NextLink
                href={CONFIG_HREF}
                variant='unstyled'
                className='inline-flex items-center gap-1.5 text-primary text-sm underline-offset-4 hover:underline'
              >
                Config keys → {CONFIG_HREF}
              </NextLink>
            </div>
          </div>
        </div>
      </section>

      <section className='border-border border-t bg-background py-14 text-center sm:py-20 lg:py-24'>
        <div className='mx-auto flex max-w-[73.75rem] flex-col items-center gap-6 px-6 sm:px-10'>
          <SectionOverline className='text-muted-foreground'>Quick start</SectionOverline>
          <SectionTitle className='max-w-2xl'>
            <LetterReveal text='Run it once and look at what it leaves behind.' />
          </SectionTitle>
          <Code className='w-fit'>$ npx @attalabs/vinaya init</Code>
        </div>
      </section>
    </>
  )
}
