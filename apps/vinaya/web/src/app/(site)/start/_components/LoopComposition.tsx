import { Card, CardContent } from '@atta/ui/components'
import { Heading, Text } from '@atta/ui/shared'
import { MarkDefs, type NounId, NounMark, NOUNS } from './StageGlyph'

/**
 * The overview's two visual sections, ported from the approved design
 * ("Vinaya loop.dc.html"): the noun vocabulary — one mark per thing, reused
 * everywhere — and the loop composition, whose geometry is copied verbatim
 * from the design's markup. The loop's shape is the model's real shape:
 * Plan fans out into per-task rows (Brief → Develop → Review and Security
 * bracketed on ONE pull request → the merge gate → Archive), the rows fan
 * back into Wrap up, and the return edge feeds the tranche's real outcome
 * into the next Plan. Containers and type are this repo's (retro `Card`,
 * shared `Heading`/`Text`, semantic tokens); the drawings are the design's.
 *
 * Mounts `MarkDefs` itself — do not mount it again on the same page.
 */

const NOUN_ORDER: NounId[] = ['intent', 'task', 'tranche', 'brief', 'pr', 'verdict', 'record', 'retro']

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className='flex flex-wrap items-baseline gap-3 border-border border-b pb-3'>
      <Heading level={3} className='font-serif text-lg font-normal text-foreground'>
        {title}
      </Heading>
      <Text as='span' size='sm' muted>
        {subtitle}
      </Text>
    </div>
  )
}

export function LoopComposition() {
  return (
    <div className='flex flex-col gap-10'>
      <MarkDefs />

      <section className='flex flex-col gap-4'>
        <SectionHeader title='The nouns' subtitle='one mark per thing, reused everywhere' />
        <div className='grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4'>
          {NOUN_ORDER.map((noun) => (
            <Card key={noun}>
              <CardContent className='flex flex-col gap-3'>
                <NounMark noun={noun} className='h-auto w-full' />
                <div className='flex flex-col gap-1'>
                  <Text as='span' size='sm' className='font-medium text-foreground'>
                    {NOUNS[noun].label}
                  </Text>
                  <Text as='span' size='xs' muted className='leading-relaxed'>
                    {NOUNS[noun].description}
                  </Text>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className='flex flex-col gap-4'>
        <SectionHeader
          title='The loop'
          subtitle='plan once, work every task in parallel, close out once — and feed the next round'
        />
        <Card>
          <CardContent className='overflow-x-auto'>
            <svg
              viewBox='0 0 1280 1090'
              className='h-auto w-full min-w-[900px]'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
              aria-hidden
            >
              <defs>
                <g
                  id='v-row'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                >
                  <rect x='130' y='-43' width='160' height='86' rx='8' />
                  <text
                    x='210'
                    y='-14'
                    textAnchor='middle'
                    fontSize='19'
                    fontWeight='600'
                    fill='currentColor'
                    stroke='none'
                  >
                    Brief
                  </text>
                  <use href='#v-brief' transform='translate(196,-4) scale(0.16)' />
                  <path d='M290 0h44' markerEnd='url(#v-ah)' />
                  <rect x='340' y='-43' width='160' height='86' rx='8' />
                  <text
                    x='420'
                    y='-14'
                    textAnchor='middle'
                    fontSize='19'
                    fontWeight='600'
                    fill='currentColor'
                    stroke='none'
                  >
                    Develop
                  </text>
                  <use href='#v-pr' transform='translate(398,-6) scale(0.16)' />
                  <path d='M500 0h30' markerEnd='url(#v-ah)' />
                  <use href='#v-pr' transform='translate(536,-26) scale(0.19)' />
                  <text
                    x='562'
                    y='44'
                    textAnchor='middle'
                    fontSize='12'
                    letterSpacing='1.1'
                    fill='var(--muted-foreground)'
                    stroke='none'
                  >
                    ONE PR
                  </text>
                  <path d='M590 -8c22 0 18-52 44-52' markerEnd='url(#v-ah)' />
                  <path d='M590 8c22 0 18 52 44 52' markerEnd='url(#v-ah)' />
                  <rect
                    x='626'
                    y='-112'
                    width='286'
                    height='224'
                    rx='10'
                    stroke='var(--muted-foreground)'
                    strokeDasharray='6 6'
                  />
                  <text
                    x='769'
                    y='-124'
                    textAnchor='middle'
                    fontSize='12'
                    letterSpacing='1.1'
                    fill='var(--muted-foreground)'
                    stroke='none'
                  >
                    AT THE SAME TIME, ON THE SAME PULL REQUEST
                  </text>
                  <rect x='648' y='-96' width='212' height='72' rx='8' />
                  <text
                    x='754'
                    y='-52'
                    textAnchor='middle'
                    fontSize='19'
                    fontWeight='600'
                    fill='currentColor'
                    stroke='none'
                  >
                    Review
                  </text>
                  <rect x='648' y='24' width='212' height='72' rx='8' />
                  <text
                    x='754'
                    y='68'
                    textAnchor='middle'
                    fontSize='19'
                    fontWeight='600'
                    fill='currentColor'
                    stroke='none'
                  >
                    Security
                  </text>
                  <use href='#v-verdict' transform='translate(866,-88) scale(0.17)' />
                  <use href='#v-verdict' transform='translate(866,32) scale(0.17)' />
                  <path d='M900 -60h18c10 0 10 60 20 60' markerEnd='url(#v-ah)' />
                  <path d='M900 60h18c10 0 10-60 20-60' markerEnd='url(#v-ah)' />
                  <circle cx='956' cy='0' r='17' />
                  <circle cx='956' cy='0' r='9' />
                  <text
                    x='956'
                    y='44'
                    textAnchor='middle'
                    fontSize='12'
                    letterSpacing='1.1'
                    fill='var(--muted-foreground)'
                    stroke='none'
                  >
                    MERGED
                  </text>
                  <path d='M973 0h29' markerEnd='url(#v-ah)' />
                  <rect x='1008' y='-43' width='160' height='86' rx='8' />
                  <text
                    x='1088'
                    y='-14'
                    textAnchor='middle'
                    fontSize='19'
                    fontWeight='600'
                    fill='currentColor'
                    stroke='none'
                  >
                    Archive
                  </text>
                  <use href='#v-record' transform='translate(1069,-4) scale(0.16)' />
                </g>
              </defs>

              <rect
                x='104'
                y='150'
                width='1160'
                height='770'
                rx='14'
                stroke='var(--muted-foreground)'
                strokeDasharray='3 7'
              />
              <text x='120' y='138' fontSize='13' letterSpacing='1.3' fill='var(--muted-foreground)' stroke='none'>
                EVERY TASK IN THE TRANCHE — ALL AT ONCE
              </text>

              <rect x='540' y='26' width='200' height='86' rx='8' />
              <text x='640' y='60' textAnchor='middle' fontSize='22' fontWeight='600' fill='currentColor' stroke='none'>
                Plan
              </text>
              <use href='#v-tranche' transform='translate(616,68) scale(0.16)' />

              <path d='M640 112v30H128v678' />
              <path d='M128 290h34' markerEnd='url(#v-ah)' />
              <path d='M128 540h34' markerEnd='url(#v-ah)' />
              <path d='M128 790h34' markerEnd='url(#v-ah)' />

              <use href='#v-row' transform='translate(40,290)' />
              <use href='#v-row' transform='translate(40,540)' opacity='0.5' />
              <use href='#v-row' transform='translate(40,790)' opacity='0.28' />

              <path d='M1208 290h32' />
              <path d='M1208 540h32' opacity='0.5' />
              <path d='M1208 790h32' opacity='0.28' />
              <path d='M1240 290v693H744' markerEnd='url(#v-ah)' />

              <rect x='540' y='940' width='200' height='86' rx='8' />
              <text
                x='640'
                y='974'
                textAnchor='middle'
                fontSize='22'
                fontWeight='600'
                fill='currentColor'
                stroke='none'
              >
                Wrap up
              </text>
              <use href='#v-retro' transform='translate(620,982) scale(0.16)' />
              <path d='M640 1026v10' />
              <circle cx='640' cy='1054' r='18' />
              <path d='M632 1054l6 7 12-15' />
              <text x='668' y='1060' fontSize='13' letterSpacing='1.2' fill='var(--muted-foreground)' stroke='none'>
                A HUMAN SAYS THE TRANCHE IS DONE
              </text>

              <path d='M540 983H52V69h484' strokeWidth='3.5' markerEnd='url(#v-ah)' />
              <text
                transform='rotate(-90 34 526)'
                x='34'
                y='526'
                textAnchor='middle'
                fontSize='15'
                fill='currentColor'
                stroke='none'
              >
                the tranche&apos;s real outcome, into the next plan
              </text>
            </svg>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
