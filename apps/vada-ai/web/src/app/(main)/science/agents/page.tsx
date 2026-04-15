'use client'

import { Heading, Text } from '@atta/ui/shared'
import { Separator } from '@atta/ui'
import { AIACanvas, AIASphere, AGENT_LIST } from '@atta/ui/canvas'
import Link from 'next/link'
import { useId } from 'react'

function AgentsScene() {
  const baseId = useId()

  return (
    <article className='space-y-16'>
      {/* Header */}
      <div className='space-y-4'>
        <span className='font-mono text-xs text-muted-foreground'>Agent Roster</span>
        <Heading level={1} className='font-serif text-4xl font-light leading-tight'>
          The Six Agents
        </Heading>
        <Text as='p' muted className='text-lg leading-relaxed'>
          Each agent is a distinct cognitive posture — not a role to be set aside, but a structural commitment
          maintained for the full duration of the deliberation.
        </Text>
      </div>

      <Separator className='opacity-20' />

      {/* Agent cards */}
      <div className='space-y-6'>
        {AGENT_LIST.map((agent) => {
          const sphereId = `${baseId}-agent-${agent.role}`
          return (
            <div key={agent.role} className='rounded-lg border border-border/20 bg-card/30 p-6 space-y-4'>
              {/* Name row with sphere */}
              <div className='flex items-center gap-4'>
                <AIASphere
                  id={sphereId}
                  size='md'
                  color={agent.color}
                  state='speaking'
                  showMatrix
                  matrixOpacity={0.6}
                  label={agent.displayName}
                  labelPosition='right'
                />
              </div>

              <div className='grid gap-4 sm:grid-cols-3 pt-2'>
                <div className='space-y-1.5'>
                  <Text as='p' className='font-mono text-[10px] uppercase tracking-widest text-muted-foreground'>
                    Function
                  </Text>
                  <Text as='p' size='sm' className='leading-relaxed text-foreground/80'>
                    {agent.function}
                  </Text>
                </div>

                <div className='space-y-1.5'>
                  <Text as='p' className='font-mono text-[10px] uppercase tracking-widest text-muted-foreground'>
                    Role
                  </Text>
                  <Text as='p' size='sm' className='leading-relaxed text-foreground/80'>
                    {agent.roleDesc}
                  </Text>
                </div>

                <div className='space-y-1.5'>
                  <Text as='p' className='font-mono text-[10px] uppercase tracking-widest text-muted-foreground'>
                    Voice
                  </Text>
                  <Text as='p' size='sm' className='font-serif italic leading-relaxed text-foreground/80'>
                    {agent.voice}
                  </Text>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <Separator className='opacity-20' />

      {/* Navigation */}
      <div className='flex items-center justify-between pt-4'>
        <Link
          href='/science/frameworks'
          className='font-mono text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline transition-colors'
        >
          ← Frameworks
        </Link>
        <Link
          href='/science/mechanics'
          className='font-mono text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline transition-colors'
        >
          Mechanics →
        </Link>
      </div>
    </article>
  )
}

export default function ScienceAgentsPage() {
  return (
    <AIACanvas alwaysRenderSpheres className='relative w-full'>
      <AgentsScene />
    </AIACanvas>
  )
}
