'use client'

import { Fragment } from 'react'
import { Heading } from '@atta/ui/components'
import { mdxComponents } from '@/components/mdx/MDXComponents'
import { SectionLabel } from '../primitives/SectionLabel'
import { SectionWrapper } from '../primitives/SectionWrapper'
import { TwoColumnSection } from '../primitives/TwoColumnSection'
import { BYOKCallout } from './mechanism/BYOKCallout'

const P = mdxComponents.p as React.ComponentType<{ children: React.ReactNode; className?: string }>
const Blockquote = mdxComponents.blockquote as React.ComponentType<{ children: React.ReactNode; className?: string }>

/**
 * Illustrative YAML — generic agent names (a, b, c), no roles, no team identity.
 * Shows the SHAPE of a team definition; not a publishable team.
 */
const ILLUSTRATIVE_YAML = `schema_version: "2.0"
id: example-team
name: An example team

agents:
  - name: agent_a
    model: anthropic/claude-sonnet
  - name: agent_b
    model: openai/gpt-4
  - name: agent_c
    model: google/gemini

flow:
  rounds:
    - id: open
      layout: parallel
      agents: [agent_a, agent_b, agent_c]
      message_template: "{{question}}"

    - id: respond
      layout: parallel
      agents: [agent_a, agent_b, agent_c]
      message_template: "{{previousRound}}"

    - id: synthesize
      layout: sequential
      agents: [agent_a]
      message_template: "{{allPreviousOutputs}}"
`

function YamlBlock() {
  return (
    <div className='border-[1.5px] border-foreground bg-background'>
      <div className='flex justify-between items-center border-b border-border px-3 py-2'>
        <span className='font-mono text-[9px] tracking-[0.2em] uppercase font-medium'>team.yaml</span>
        <span className='font-mono text-[9px] tracking-[0.14em] text-muted-foreground uppercase'>declarative</span>
      </div>
      <pre className='p-4 font-mono text-[10px] leading-[1.6] text-foreground/85 overflow-x-auto whitespace-pre'>
        <code>{ILLUSTRATIVE_YAML}</code>
      </pre>
    </div>
  )
}

/**
 * Compiled flow — horizontal rounds row, abstract round columns, no names.
 * Sits beneath the YAML so the declarative → executable mapping reads
 * vertically rather than in cramped side-by-side columns.
 */
function CompiledFlowBlock() {
  // 3 rounds matching the YAML: parallel/parallel/sequential
  const rounds = [
    { id: 'open', layout: 'parallel', count: 3 },
    { id: 'respond', layout: 'parallel', count: 3 },
    { id: 'synthesize', layout: 'sequential', count: 1 }
  ]

  return (
    <div className='border-[1.5px] border-foreground bg-background'>
      <div className='flex justify-between items-center border-b border-border px-3 py-2'>
        <span className='font-mono text-[9px] tracking-[0.2em] uppercase font-medium'>compiled flow</span>
        <span className='font-mono text-[9px] tracking-[0.14em] text-muted-foreground uppercase'>executable</span>
      </div>
      <div className='p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-3'>
        {rounds.map((round, idx) => (
          <Fragment key={round.id}>
            <div className='flex flex-col gap-2'>
              <div className='flex items-center justify-between'>
                <span className='font-mono text-[9px] tracking-[0.18em] uppercase text-muted-foreground'>
                  round · {round.id}
                </span>
                <span className='font-mono text-[8px] tracking-[0.14em] uppercase text-muted-foreground/70'>
                  {round.layout}
                </span>
              </div>
              <div className={round.layout === 'parallel' ? 'grid grid-cols-3 gap-1.5' : 'grid grid-cols-1 gap-1.5'}>
                {Array.from({ length: round.count }, (_, i) => (
                  <div key={i} className='h-8 border border-border bg-muted/30 flex items-center justify-center'>
                    <div className='w-1.5 h-1.5 rounded-full bg-foreground/60' />
                  </div>
                ))}
              </div>
            </div>
            {idx < rounds.length - 1 && (
              <>
                <div className='hidden sm:flex items-center justify-center text-foreground/50 font-mono text-base'>
                  →
                </div>
                <div className='flex sm:hidden items-center justify-center py-1 text-foreground/50 font-mono'>↓</div>
              </>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

export function MechanismSection() {
  const textColumn = (
    <div className='flex flex-col gap-10 md:gap-14'>
      <div className='flex flex-col gap-6 md:gap-8'>
        <SectionLabel>03 / The Engine</SectionLabel>

        <Heading level={2} className='font-serif text-4xl md:text-5xl lg:text-6xl text-foreground leading-tight'>
          <span className='block'>Built on the</span>
          <span className='block text-muted-foreground'>Atta Engine.</span>
        </Heading>

        <P>
          The Atta Engine is the deliberation runtime built by AttaLabs. Vāda is the first system to run on it. The
          engine handles parallel execution, state passing, audit gates, revision loops, and the audit trail. Vāda
          provides the teams.
        </P>

        <P>
          A team is defined in YAML. A team is a sequence of rounds. A round has agents. Agents have models, prompts,
          and a place in the flow. To launch a new team, write a YAML file. To change a team, change the YAML. There is
          no team-specific code.
        </P>

        <P>
          The same engine runs every team — from a single reviewer on one model to a multi-round panel with
          cross-critique and audit. Whatever the YAML says, the engine runs.
        </P>

        <Blockquote>
          <P>
            <span className='font-bold not-italic'>The engine is the foundation.</span> The teams are how you put it to
            work.
          </P>
        </Blockquote>
      </div>

      <BYOKCallout />
    </div>
  )

  const diagramColumn = (
    <div className='relative w-full p-4 sm:p-6 lg:p-8 border border-border bg-background/80'>
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
          maskImage: 'radial-gradient(ellipse at center, black 15%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 15%, transparent 85%)'
        }}
      />

      <div className='relative z-10'>
        <div className='flex items-baseline justify-between mb-8 hidden sm:flex'>
          <div className='font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground'>
            Schema-03 · Engine Pipeline
          </div>
          <div className='font-serif text-sm font-medium text-foreground italic'>AttaLabs</div>
        </div>

        {/* YAML on top */}
        <YamlBlock />

        {/* Arrow between YAML and compiled flow */}
        <div className='flex flex-col items-center justify-center py-4 gap-2'>
          <div className='font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground'>compileFlow</div>
          <div className='text-2xl text-foreground/70 font-mono leading-none'>↓</div>
        </div>

        {/* Compiled flow below */}
        <CompiledFlowBlock />

        {/* Caption */}
        <div className='text-center font-serif italic text-sm text-muted-foreground my-8 max-w-md mx-auto'>
          A team is declarative data. The engine is the only code that runs it.
        </div>

        {/* Engine output → optional audit → outcomes pipeline */}
        <div className='border-[1.5px] border-foreground bg-background grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch'>
          <div className='p-4 flex flex-col justify-center'>
            <div className='font-mono text-[9px] tracking-[0.14em] font-bold uppercase mb-2'>Engine output</div>
            <ul className='space-y-1 text-[11px] text-muted-foreground'>
              <li className='flex items-center gap-2'>
                <span className='text-[6px]'>■</span> Structured conclusion
              </li>
              <li className='flex items-center gap-2'>
                <span className='text-[6px]'>■</span> Full transcript
              </li>
              <li className='flex items-center gap-2'>
                <span className='text-[6px]'>■</span> Cost & timing metrics
              </li>
            </ul>
          </div>

          <div className='hidden lg:flex items-center justify-center border-x border-border px-3 text-muted-foreground font-mono'>
            →
          </div>
          <div className='flex lg:hidden items-center justify-center py-1 text-muted-foreground font-mono'>↓</div>

          <div className='p-4 flex flex-col items-center justify-center text-center border-y lg:border-y-0 border-border'>
            <div className='text-lg text-foreground mb-1'>⊘</div>
            <div className='font-mono text-[9px] tracking-[0.16em] font-bold uppercase text-foreground mb-1'>
              Optional audit
            </div>
            <div className='font-serif italic text-[11px] text-muted-foreground leading-tight'>
              If the team defines one. The engine evaluates the signal and routes to revision or accepts.
            </div>
          </div>

          <div className='hidden lg:flex items-center justify-center border-x border-border px-3 text-muted-foreground font-mono'>
            →
          </div>
          <div className='flex lg:hidden items-center justify-center py-1 text-muted-foreground font-mono'>↓</div>

          <div className='p-4 flex flex-col justify-center gap-2'>
            <div className='pl-2 border-l-[3px] border-success'>
              <div className='font-mono text-[8px] tracking-[0.14em] font-bold uppercase text-success'>Clean</div>
              <div className='text-[10px] text-muted-foreground'>Passed.</div>
            </div>
            <div className='pl-2 border-l-[3px] border-warning'>
              <div className='font-mono text-[8px] tracking-[0.14em] font-bold uppercase text-warning'>Revised</div>
              <div className='text-[10px] text-muted-foreground'>Audit caught something. Team fixed it.</div>
            </div>
            <div className='pl-2 border-l-[3px] border-destructive'>
              <div className='font-mono text-[8px] tracking-[0.14em] font-bold uppercase text-destructive'>
                Unconverged
              </div>
              <div className='text-[10px] text-muted-foreground'>Honest signal, not failure.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <SectionWrapper id='mechanism'>
      <TwoColumnSection
        className='md:grid-cols-[1fr_1.2fr] md:items-start gap-y-12'
        left={textColumn}
        right={diagramColumn}
      />
    </SectionWrapper>
  )
}
