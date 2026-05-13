'use client'

import { Heading } from '@atta/ui'
import { mdxComponents } from '@/components/mdx/MDXComponents'
import { SectionLabel } from '../primitives/SectionLabel'
import { SectionWrapper } from '../primitives/SectionWrapper'
import { TwoColumnSection } from '../primitives/TwoColumnSection'

const P = mdxComponents.p as React.ComponentType<{ children: React.ReactNode; className?: string }>
const Blockquote = mdxComponents.blockquote as React.ComponentType<{ children: React.ReactNode; className?: string }>

/**
 * Down-arrow connector for the flow diagram.
 */
function DownArrow() {
  return (
    <div className='flex justify-center py-2 relative z-10'>
      <div className='w-[2px] h-6 bg-foreground relative'>
        <div className='absolute -bottom-[3px] -left-[3.5px] w-2 h-2 border-r-[1.5px] border-b-[1.5px] border-foreground rotate-45' />
      </div>
    </div>
  )
}

/**
 * Generic "round" block — N parallel agent slots, no names.
 * Used to illustrate the shape of a deliberation without committing to a
 * specific team's agent count, roles, or round count.
 */
function GenericRound({ label, agentCount = 3, parallel = true }: { label: string; agentCount?: number; parallel?: boolean }) {
  const slots = Array.from({ length: agentCount }, (_, i) => i)

  return (
    <div className='relative border-[1.5px] border-foreground bg-background p-4 mb-1'>
      <div className='absolute -top-[9px] left-3 bg-background px-2 font-mono text-[8px] tracking-[0.18em] text-muted-foreground uppercase font-medium'>
        {label}
      </div>
      <div className={parallel ? 'grid grid-cols-3 gap-3 mt-2' : 'flex flex-col gap-2 mt-2'}>
        {slots.map((i) => (
          <div
            key={i}
            className='flex items-center gap-2 p-2 border border-border bg-muted/20'
            aria-label={`agent slot ${i + 1}`}
          >
            <div className='w-2 h-2 rounded-full bg-foreground/70' />
            <div className='flex-1'>
              <div className='h-1.5 bg-foreground/20 rounded-sm mb-1' style={{ width: `${60 + (i * 13) % 30}%` }} />
              <div className='h-1.5 bg-foreground/10 rounded-sm' style={{ width: `${40 + (i * 17) % 35}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Optional audit gate — dashed to signal "if the team includes it".
 */
function OptionalGate({ label, sublabel }: { label: string; sublabel: string }) {
  return (
    <div className='relative border-[1.5px] border-dashed border-foreground/60 bg-muted/10 p-4 mb-1'>
      <div className='absolute -top-[9px] left-3 bg-background px-2 font-mono text-[8px] tracking-[0.18em] text-muted-foreground uppercase font-medium'>
        {label}
      </div>
      <div className='absolute -top-[9px] right-3 bg-background px-2 font-mono text-[8px] tracking-[0.14em] text-muted-foreground/80 uppercase italic'>
        optional
      </div>
      <div className='font-serif italic text-sm text-muted-foreground tracking-tight mt-1'>{sublabel}</div>
    </div>
  )
}

export function SeeItWorkSection() {
  const textColumn = (
    <div className='flex flex-col gap-6 md:gap-8 lg:sticky lg:top-24'>
      <SectionLabel>02 / How It Works</SectionLabel>

      <Heading level={2} className='font-serif text-3xl md:text-4xl lg:text-5xl text-foreground leading-tight'>
        A question goes in. A deliberation happens. A conclusion comes out.
      </Heading>

      <P>
        You bring a question. Vāda doesn't try to answer it directly — it interrogates it. Multiple agents read the
        question, write independent positions, and respond to each other under a structured protocol.
      </P>

      <P>
        The shape of the protocol — how many rounds, how many agents, whether the result is audited and revised — is
        defined by the <strong>team</strong> you pick. Some teams run a single round of independent reviewers. Others
        run multiple adversarial rounds with audit gates and revision loops.
      </P>

      <P>
        Whatever the shape, the output is the same kind of artifact: a structured conclusion with the full transcript
        attached. Every word from every agent is preserved.
      </P>

      <Blockquote>
        <P>
          The question you walked in with is not the question you walk out with.{' '}
          <span className='font-bold'>That reframe is the product.</span>
        </P>
      </Blockquote>
    </div>
  )

  const diagramColumn = (
    <div className='relative w-full p-4 sm:p-6 border border-border bg-background/80'>
      {/* Blueprint Grid Mask Layer */}
      <div
        className='absolute inset-0 pointer-events-none z-0 opacity-40'
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          backgroundPosition: '-1px -1px',
          maskImage: 'radial-gradient(ellipse at center, black 10%, transparent 90%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 10%, transparent 90%)'
        }}
      />

      <div className='relative z-10'>
        <div className='flex items-baseline justify-between mb-6 hidden sm:flex'>
          <div className='font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground'>
            Schema — Deliberation Flow
          </div>
          <div className='font-serif text-sm font-medium text-foreground italic'>Vāda</div>
        </div>

        {/* Input */}
        <div className='relative border-[1.5px] border-foreground bg-background p-4 sm:p-5 mb-1'>
          <div className='absolute -top-[9px] left-3 bg-background px-2 font-mono text-[8px] tracking-[0.18em] text-muted-foreground uppercase font-medium'>
            Input
          </div>
          <div className='font-serif italic text-base text-foreground tracking-tight'>
            Your question. The decision you're stuck on.
          </div>
        </div>

        <DownArrow />

        {/* Generic deliberation — abstract rounds */}
        <GenericRound label='Round · independent positions' agentCount={3} parallel={true} />
        <DownArrow />
        <GenericRound label='Round · response & critique' agentCount={3} parallel={true} />
        <DownArrow />

        {/* Optional audit/revision */}
        <OptionalGate
          label='Audit & revise'
          sublabel='Some teams add an audit gate. If the conclusion fails review, the team revises.'
        />

        <DownArrow />

        {/* Conclusion */}
        <div className='relative border-[1.5px] border-foreground bg-muted/30 p-5'>
          <div className='absolute -top-[9px] left-3 bg-background px-2 font-mono text-[8px] tracking-[0.18em] font-medium text-foreground uppercase'>
            Conclusion
          </div>
          <div className='absolute -top-[9px] right-3 bg-background px-2 font-mono text-[8px] tracking-[0.14em] text-success border border-success uppercase'>
            + transcript
          </div>

          <ul className='mt-1 space-y-2.5 text-[12px] sm:text-[13px] text-foreground/80'>
            <li className='flex items-baseline gap-2.5'>
              <span className='w-[5px] h-[5px] rounded-full shrink-0 translate-y-[-1px] bg-foreground/60' />
              <span>Structured recommendation</span>
            </li>
            <li className='flex items-baseline gap-2.5'>
              <span className='w-[5px] h-[5px] rounded-full shrink-0 translate-y-[-1px] bg-foreground/60' />
              <span>Convergence and dissent, named</span>
            </li>
            <li className='flex items-baseline gap-2.5'>
              <span className='w-[5px] h-[5px] rounded-full shrink-0 translate-y-[-1px] bg-foreground/60' />
              <span>What was assumed and what remains open</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )

  return (
    <SectionWrapper id='see-it-work'>
      <TwoColumnSection className='md:grid-cols-[1.2fr_1fr] md:items-start' left={diagramColumn} right={textColumn} />
    </SectionWrapper>
  )
}
