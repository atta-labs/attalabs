'use client'

import { Heading } from '@atta/ui'
import { mdxComponents } from '@/components/mdx/MDXComponents'
import { SectionLabel } from '../primitives/SectionLabel'
import { SectionWrapper } from '../primitives/SectionWrapper'
import { TwoColumnSection } from '../primitives/TwoColumnSection'
import { BYOKCallout } from './mechanism/BYOKCallout'

const P = mdxComponents.p as React.ComponentType<{ children: React.ReactNode; className?: string }>
const Blockquote = mdxComponents.blockquote as React.ComponentType<{ children: React.ReactNode; className?: string }>

/**
 * Illustrative YAML — generic agent names (a, b, c), no roles, no team identity.
 * The point is to show the SHAPE of a team definition, not to publish a real team.
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
 * Compiled flow — abstract round columns, no names, no labels.
 * Maps 1:1 with the rounds in ILLUSTRATIVE_YAML so the visual parity is obvious.
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
      <div className='p-4 flex flex-col gap-3'>
        {rounds.map((round, idx) => (
          <div key={round.id} className='flex flex-col gap-1.5'>
            <div className='flex items-center justify-between'>
              <span className='font-mono text-[9px] tracking-[0.18em] uppercase text-muted-foreground'>
                round · {round.id}
              </span>
              <span className='font-mono text-[8px] tracking-[0.14em] uppercase text-muted-foreground/70'>
                {round.layout}
              </span>
            </div>
            <div className={round.layout === 'parallel' ? 'grid grid-cols-3 gap-1.5' : 'flex flex-col gap-1.5'}>
              {Array.from({ length: round.count }, (_, i) => (
                <div key={i} className='h-6 border border-border bg-muted/30 flex items-center justify-center'>
                  <div className='w-1.5 h-1.5 rounded-full bg-foreground/60' />
                </div>
              ))}
            </div>
            {idx < rounds.length - 1 && (
              <div className='flex justify-center py-0.5'>
                <div className='font-mono text-[10px] text-foreground/50'>↓</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function MechanismSection() {
  const textColumn = (
    <div className='flex flex-col gap-10 md:gap-14 lg:sticky lg:top-24'>
      <div className='flex flex-col gap-6 md:gap-8'>
        <SectionLabel>03 / The Engine</SectionLabel>

        <Heading level={2} className='font-serif text-4xl md:text-5xl lg:text-6xl text-foreground leading-tight'>
          <span className='block'>One engine.</span>
          <span className='block text-muted-foreground'>Any team you can describe.</span>
        </Heading>

        <P>
          Every deliberation runs on the Atta Engine — a compiler that turns a team definition into an executable flow.
          The team is the configuration. The engine is the runtime.
        </P>

        <P>
          A team is defined in YAML. A team is a sequence of rounds. A round has agents. Agents have models, prompts,
          and a place in the flow. Add an audit gate or a revision loop by describing it. The engine handles parallel
          execution, state passing, conditional routing, and the audit trail.
        </P>

        <P>
          To ship a new team, write a YAML file. To change a team's behavior, change the YAML. There is no team-specific
          code. Whatever the YAML says, the engine runs.
        </P>

        <Blockquote>
          <P>
            <span className='font-bold not-italic'>The engine is the product.</span> The teams are the language you
            speak to it.
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
        <div className='flex items-baseline justify-between mb-10 hidden sm:flex'>
          <div className='font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground'>
            Schema-03 · The Engine
          </div>
          <div className='font-serif text-sm font-medium text-foreground italic'>Vāda</div>
        </div>

        {/* YAML → compileFlow → executable plan */}
        <div className='grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-3 items-stretch mb-6'>
          <YamlBlock />

          <div className='hidden lg:flex flex-col items-center justify-center px-2 gap-2'>
            <div className='font-mono text-[8px] tracking-[0.18em] uppercase text-muted-foreground'>compileFlow</div>
            <div className='text-2xl text-foreground/70 font-mono'>→</div>
          </div>
          <div className='flex lg:hidden items-center justify-center py-2 gap-2'>
            <div className='font-mono text-[8px] tracking-[0.18em] uppercase text-muted-foreground'>compileFlow</div>
            <div className='text-xl text-foreground/70 font-mono'>↓</div>
          </div>

          <CompiledFlowBlock />
        </div>

        <div className='text-center font-serif italic text-sm text-muted-foreground mb-8 max-w-md mx-auto'>
          A team is declarative data. The engine is the only code that executes a deliberation.
        </div>

        {/* The pipeline downstream — generic stages */}
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
      <TwoColumnSection className='md:grid-cols-[1fr_1.2fr] md:items-start' left={textColumn} right={diagramColumn} />
    </SectionWrapper>
  )
}
