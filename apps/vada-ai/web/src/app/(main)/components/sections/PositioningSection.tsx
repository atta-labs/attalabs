'use client'

import { Heading } from '@atta/ui'
import { mdxComponents } from '@/components/mdx/MDXComponents'
import { SectionLabel } from '../primitives/SectionLabel'
import { SectionWrapper } from '../primitives/SectionWrapper'
import { StatusFooter } from '../primitives/StatusFooter'
import { TwoColumnSection } from '../primitives/TwoColumnSection'
import { ArchitectureDiagram } from './ArchitectureDiagram'

const P = mdxComponents.p as React.ComponentType<{ children: React.ReactNode; className?: string }>
const Blockquote = mdxComponents.blockquote as React.ComponentType<{ children: React.ReactNode; className?: string }>

/**
 * Anonymous deliberation cluster — abstract nodes, no team-specific roles.
 * Each node is a softly pulsing dot connected by lines to suggest a room of agents
 * exchanging signal. Stable across team catalog changes by design.
 */
function DeliberationCluster() {
  // 5 nodes on a soft circle — generic, not a specific count of agents
  const nodes = [
    { cx: 100, cy: 30 },
    { cx: 170, cy: 75 },
    { cx: 140, cy: 155 },
    { cx: 60, cy: 155 },
    { cx: 30, cy: 75 }
  ]

  return (
    <svg viewBox='0 0 200 200' className='w-full max-w-sm mx-auto'>
      <title>Anonymous deliberation cluster</title>
      {/* Connecting lines between every pair — the room is fully wired */}
      {nodes.map((a, i) =>
        nodes.slice(i + 1).map((b, j) => (
          <line
            key={`${i}-${j}`}
            x1={a.cx}
            y1={a.cy}
            x2={b.cx}
            y2={b.cy}
            stroke='hsl(var(--border))'
            strokeWidth='1'
            opacity='0.5'
          />
        ))
      )}
      {/* Outer subtle ring */}
      {nodes.map((n, i) => (
        <circle
          key={`outer-${i}`}
          cx={n.cx}
          cy={n.cy}
          r='14'
          fill='none'
          stroke='hsl(var(--foreground))'
          strokeWidth='0.5'
          opacity='0.3'
        />
      ))}
      {/* Inner solid nodes */}
      {nodes.map((n, i) => (
        <circle key={`node-${i}`} cx={n.cx} cy={n.cy} r='8' fill='hsl(var(--foreground))' opacity='0.85' />
      ))}
    </svg>
  )
}

export function PositioningSection() {
  return (
    <SectionWrapper id='positioning'>
      <TwoColumnSection
        className='md:grid-cols-[1.2fr_1fr]'
        left={
          <div className='flex flex-col gap-8'>
            <SectionLabel>01 / Positioning</SectionLabel>

            <Heading level={2} className='font-serif text-4xl md:text-6xl text-primary leading-tight'>
              <span className='block'>Vāda is not a factory.</span>
              <span className='block'>Vāda is deliberation.</span>
            </Heading>

            <P className='max-w-xl'>
              The AI industry is racing to build better factories. Agent swarms that browse the web, read codebases,
              execute tasks at lightspeed. These are execution tools, and they have a blind spot. They assume the
              question is the right question. Give an execution swarm a bad idea and it will execute it perfectly.
            </P>

            <Blockquote className='max-w-xl'>
              <P>
                Vāda sits above execution. You bring a decision to Vāda before you commit resources to it — to
                stress-test the strategy, attack the assumptions, and find the blind spots.
              </P>
            </Blockquote>

            <StatusFooter
              label='Closed-Room Protocol'
              body='No external tools. No web access. No code execution. The friction of the debate must not be diluted.'
            />
          </div>
        }
        right={
          <div className='flex flex-col gap-8'>
            <div className='bg-background/80 border p-8'>
              <DeliberationCluster />
            </div>
            <div className='bg-background/80 border p-4 px-6'>
              <ArchitectureDiagram />
            </div>
          </div>
        }
      />
    </SectionWrapper>
  )
}
