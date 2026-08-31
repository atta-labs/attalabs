import { NextLink } from '@atta/ui/lib/next-link'
import { cn } from '@atta/ui/lib/utils'
import { Text } from '@atta/ui/shared'
import { RevealGrid } from '../../_components/landing/LandingInteractions'
import { LandingSection } from '../../_components/landing/LandingSection'
import { SectionOverline, SectionTitle } from '../../_components/landing/SectionHeading'

// Frozen against the arXiv full text — a divergence here is a stop condition,
// never a silent correction. Handoff's with-feedback figure is heterogeneous
// across models, not absent: 3 of 4 models stayed at 0%, one (DeepSeek-V4-Pro)
// reached 3/9 (33%) — rendered as the resulting range, not collapsed to one point.
// `lo`/`hi` exist only to draw the bar; `label` is the authority and is what the
// reader sees — a divergence between them is a rendering bug, not a data change.
const RULE_TYPES = [
  { rule: 'Disclose', unaided: { label: '17–40%', lo: 17, hi: 40 }, withFeedback: { label: '55–97%', lo: 55, hi: 97 } },
  { rule: 'Verify', unaided: { label: '4–92%', lo: 4, hi: 92 }, withFeedback: { label: '90–100%', lo: 90, hi: 100 } },
  { rule: 'Refuse', unaided: { label: '0%', lo: 0, hi: 0 }, withFeedback: { label: '≤ 23%', lo: 0, hi: 23 } },
  { rule: 'Handoff', unaided: { label: '0%', lo: 0, hi: 0 }, withFeedback: { label: '0–33%', lo: 0, hi: 33 } }
] as const

type Range = { label: string; lo: number; hi: number }

// The page's one legitimate `style={{}}` — RULE 3's "dynamically computed
// numeric value" exception. Nothing else in this page needs it.
function RangeBar({ range, tone }: { range: Range; tone: 'unaided' | 'feedback' }) {
  const zero = range.hi === 0
  return (
    <span className='relative block h-3 w-full rounded-full bg-muted'>
      <span
        className={cn(
          'absolute inset-y-0 rounded-full',
          zero ? 'w-1.5 bg-destructive' : tone === 'feedback' ? 'bg-primary' : 'bg-muted-foreground/40'
        )}
        style={zero ? { left: 0 } : { left: `${range.lo}%`, width: `${range.hi - range.lo}%` }}
      />
    </span>
  )
}

function RuleRow({ row }: { row: (typeof RULE_TYPES)[number] }) {
  return (
    <div className='grid items-center gap-8 border-t border-border py-6 md:grid-cols-[minmax(8rem,13rem)_1fr]'>
      <Text className='font-serif text-3xl leading-tight tracking-tight'>{row.rule}</Text>
      <div className='flex flex-col gap-3.5'>
        <div className='grid items-center gap-4 sm:grid-cols-[7.5rem_1fr_5.5rem]'>
          <Text as='span' className='font-mono text-[0.625rem] uppercase tracking-[0.16em] text-muted-foreground'>
            Unaided
          </Text>
          <RangeBar range={row.unaided} tone='unaided' />
          <Text
            as='span'
            className={cn(
              'text-right font-mono text-sm',
              row.unaided.hi === 0 ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {row.unaided.label}
          </Text>
        </div>
        <div className='grid items-center gap-4 sm:grid-cols-[7.5rem_1fr_5.5rem]'>
          <Text as='span' className='font-mono text-[0.625rem] uppercase tracking-[0.16em] text-muted-foreground'>
            With feedback
          </Text>
          <RangeBar range={row.withFeedback} tone='feedback' />
          <Text as='span' className='text-right font-mono text-sm font-semibold'>
            {row.withFeedback.label}
          </Text>
        </div>
      </div>
    </div>
  )
}

export function EvidenceSection() {
  return (
    <LandingSection id='evidence' background='bg-card text-card-foreground'>
      <SectionOverline className='text-center text-muted-foreground'>the evidence</SectionOverline>
      <SectionTitle className='mt-4 text-center' leading='tight'>
        What the rules-following research actually found
      </SectionTitle>

      <RevealGrid className='mt-10'>
        <div className='flex items-center justify-between px-1 font-mono text-[0.625rem] text-muted-foreground md:pl-[calc(13rem+2rem)]'>
          <span>0</span>
          <span>50</span>
          <span>100%</span>
        </div>
        {RULE_TYPES.map((row, index) => (
          <div
            key={row.rule}
            className={cn(
              'translate-y-3.5 opacity-0 transition-all duration-500 group-data-[visible=true]/reveal:translate-y-0 group-data-[visible=true]/reveal:opacity-100',
              index % 3 === 1 && 'delay-[90ms]',
              index % 3 === 2 && 'delay-[180ms]'
            )}
          >
            <RuleRow row={row} />
          </div>
        ))}
        <Text as='p' className='mt-4 font-mono text-xs text-muted-foreground'>
          4 models, 49 repos, 1,120 base runs —{' '}
          <NextLink href='https://arxiv.org/abs/2607.26819' variant='subtle'>
            arXiv 2607.26819
          </NextLink>
        </Text>
      </RevealGrid>

      <div className='mt-16 grid gap-14 md:grid-cols-2 md:items-start'>
        <blockquote className='border-l-4 border-primary pl-7'>
          <Text className='text-balance font-serif text-2xl leading-snug tracking-tight text-foreground sm:text-3xl'>
            “Bans and human gates need enforcement outside the agent.”
          </Text>
          <Text className='mt-3 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground'>
            the study’s own conclusion
          </Text>
        </blockquote>

        <div className='flex flex-col gap-6'>
          <Text className='leading-relaxed text-muted-foreground'>
            A second, larger study — 5,000+ runs against SWE-bench Verified — found random rule files scored 63.8%,
            identical to curated rule files at 63.8% (Q=4.70, p=0.697), while every rule condition beat the no-rules
            baseline of 50.0% by roughly 7–14 points. What the rules said made no measurable difference across those
            conditions — pointing instead to a context-priming effect.{' '}
            <NextLink href='https://arxiv.org/abs/2604.11088' variant='subtle'>
              arXiv 2604.11088
            </NextLink>
          </Text>
          <Text className='leading-relaxed text-muted-foreground'>
            A third study found context files added to a coding agent’s setup do not generally improve its success rate
            — even though agents largely follow what the files say — and increase cost by over 20%.{' '}
            <NextLink href='https://arxiv.org/abs/2602.11988' variant='subtle'>
              arXiv 2602.11988
            </NextLink>
          </Text>
        </div>
      </div>
    </LandingSection>
  )
}
