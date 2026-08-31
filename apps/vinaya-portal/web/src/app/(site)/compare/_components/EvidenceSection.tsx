import { NextLink } from '@atta/ui/lib/next-link'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@atta/ui/components'
import { Text } from '@atta/ui/shared'
import { LandingSection } from '../../_components/landing/LandingSection'
import { SectionOverline, SectionTitle } from '../../_components/landing/SectionHeading'

// Frozen against the arXiv full text — a divergence here is a stop condition,
// never a silent correction. Handoff's with-feedback figure is heterogeneous
// across models, not absent: 3 of 4 models stayed at 0%, one (DeepSeek-V4-Pro)
// reached 3/9 (33%) — rendered as the resulting range, not collapsed to one point.
const RULE_TYPES = [
  { rule: 'Disclose', unaided: '17–40%', withFeedback: '55–97%' },
  { rule: 'Verify', unaided: '4–92%', withFeedback: '90–100%' },
  { rule: 'Refuse', unaided: '0%', withFeedback: '≤ 23%' },
  { rule: 'Handoff', unaided: '0%', withFeedback: '0–33%' }
] as const

export function EvidenceSection() {
  return (
    <LandingSection id='evidence' background='bg-card text-card-foreground'>
      <SectionOverline className='text-center text-muted-foreground'>the evidence</SectionOverline>
      <SectionTitle className='mt-4 text-center' leading='tight'>
        What the rules-following research actually found
      </SectionTitle>

      <div className='mt-10'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='font-semibold text-foreground'>Rule type</TableHead>
              <TableHead className='font-semibold text-foreground'>Unaided</TableHead>
              <TableHead className='font-semibold text-foreground'>With feedback</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {RULE_TYPES.map((row) => (
              <TableRow key={row.rule}>
                <TableCell className='font-sans text-sm text-foreground'>{row.rule}</TableCell>
                <TableCell className='font-mono text-sm text-muted-foreground'>{row.unaided}</TableCell>
                <TableCell className='font-mono text-sm text-foreground'>{row.withFeedback}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableCaption className='text-left'>
            4 models, 49 repos, 1,120 base runs —{' '}
            <NextLink href='https://arxiv.org/abs/2607.26819' variant='subtle'>
              arXiv 2607.26819
            </NextLink>
          </TableCaption>
        </Table>
      </div>

      <blockquote className='mt-10 max-w-2xl border-l-4 border-primary pl-7'>
        <Text className='text-balance font-serif text-2xl leading-snug tracking-tight text-foreground sm:text-3xl'>
          “Bans and human gates need enforcement outside the agent.”
        </Text>
        <Text className='mt-3 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground'>
          the study’s own conclusion
        </Text>
      </blockquote>

      <div className='mt-10 max-w-2xl'>
        <Text className='leading-relaxed text-muted-foreground'>
          A second, larger study — 5,000+ runs against SWE-bench Verified — found random rule files scored 63.8%,
          identical to curated rule files at 63.8% (Q=4.70, p=0.697), while every rule condition beat the no-rules
          baseline of 50.0% by roughly 7–14 points. What the rules said made no measurable difference across those
          conditions — pointing instead to a context-priming effect.{' '}
          <NextLink href='https://arxiv.org/abs/2604.11088' variant='subtle'>
            arXiv 2604.11088
          </NextLink>
        </Text>
        <Text className='mt-6 leading-relaxed text-muted-foreground'>
          A third study found context files added to a coding agent’s setup do not generally improve its success rate —
          even though agents largely follow what the files say — and increase cost by over 20%.{' '}
          <NextLink href='https://arxiv.org/abs/2602.11988' variant='subtle'>
            arXiv 2602.11988
          </NextLink>
        </Text>
      </div>
    </LandingSection>
  )
}
