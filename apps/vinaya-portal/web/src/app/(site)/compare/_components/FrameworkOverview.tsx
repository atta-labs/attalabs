import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Text } from '@atta/ui/shared'
import { cn } from '@atta/ui/lib/utils'
import { LandingSection } from '../../_components/landing/LandingSection'
import { SectionOverline, SectionTitle } from '../../_components/landing/SectionHeading'
import { FRAMEWORKS, INCLUSION_THRESHOLD_STARS, REVIEW_DATE } from '../_lib/comparison-data'

export function FrameworkOverview() {
  return (
    <LandingSection id='frameworks' background='bg-background text-foreground'>
      <SectionOverline className='text-muted-foreground'>the open-source market</SectionOverline>
      <SectionTitle className='mt-4 max-w-2xl' leading='tight'>
        Five frameworks, one comparison
      </SectionTitle>

      <blockquote className='mt-8 max-w-2xl border-l-4 border-border pl-6'>
        <Text className='leading-relaxed text-muted-foreground'>
          This comparison covers active open-source frameworks for AI-assisted software development with at least{' '}
          {INCLUSION_THRESHOLD_STARS.toLocaleString('en-US')} GitHub stars, reviewed {REVIEW_DATE}. Stars select the
          comparison set; they do not measure product quality. Core distributions are evaluated separately from
          extensions.
        </Text>
      </blockquote>
      <Text as='p' className='mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground/80'>
        A note on runtime automation: GitHub’s own Agentic Workflows (gh-aw) can require a workflow run to pass, but
        it’s a CI-automation product, not a development-methodology framework — mentioned for context, not scored below.
      </Text>

      <div className='mt-10'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='font-semibold text-foreground'>Framework</TableHead>
              <TableHead className='font-semibold text-foreground'>Stars</TableHead>
              <TableHead className='font-semibold text-foreground'>License</TableHead>
              <TableHead className='font-semibold text-foreground'>Primary strength</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {FRAMEWORKS.map((fw) => (
              <TableRow key={fw.key} className={cn(fw.highlight && 'bg-primary/5')}>
                <TableCell>
                  <NextLink
                    href={fw.repoUrl}
                    variant='unstyled'
                    target='_blank'
                    rel='noreferrer'
                    className={cn(
                      'font-sans text-sm underline-offset-4 hover:underline',
                      fw.highlight ? 'font-semibold text-primary' : 'text-foreground'
                    )}
                  >
                    {fw.name}
                  </NextLink>
                </TableCell>
                <TableCell className='font-mono text-sm text-muted-foreground'>
                  {fw.highlight ? '—' : fw.stars.toLocaleString('en-US')}
                </TableCell>
                <TableCell className='font-mono text-sm text-muted-foreground'>{fw.license}</TableCell>
                <TableCell className='max-w-md text-sm leading-relaxed text-muted-foreground'>
                  {fw.primaryStrength}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </LandingSection>
  )
}
