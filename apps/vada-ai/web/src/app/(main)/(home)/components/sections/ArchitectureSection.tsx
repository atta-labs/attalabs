'use client'

import { Heading, Text } from '@atta/ui'
import { EyeOff, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { QuarantineMesh } from './QuarantineMesh'

interface Point {
  icon: LucideIcon
  title: string
  body: string
}

const POINTS: Point[] = [
  {
    icon: ShieldCheck,
    title: 'Isolated Instance ID',
    body: 'Each agent runs on a hardware-isolated instance to prevent weight leakage.'
  },
  {
    icon: EyeOff,
    title: 'Blinded Peer-Review',
    body: 'Arguments are stripped of metadata before being passed to the Critic.'
  }
]

export function ArchitectureSection() {
  return (
    <section className='bg-background py-24 md:py-32'>
      <div className='mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-[1.3fr_1fr] md:items-center'>
        <div className='flex flex-col gap-6'>
          <Text as='small' className='font-mono uppercase tracking-widest text-xs text-primary'>
            02 / Architecture
          </Text>
          <Heading level={2} className='font-serif text-4xl md:text-5xl text-foreground leading-tight'>
            Preventing Persona Collapse via Cognitive Quarantine
          </Heading>
          <Text as='p' className='text-muted-foreground max-w-xl'>
            In standard LLM chains, &ldquo;Persona Collapse&rdquo; occurs when agents inadvertently mirror each
            other&rsquo;s tone and logic. Vāda enforces isolation through independent context windows and asynchronous
            token processing.
          </Text>
          <div className='flex flex-col gap-4 pt-2'>
            {POINTS.map(({ icon: Icon, title, body }) => (
              <div key={title} className='flex flex-row gap-3'>
                <Icon className='mt-1 h-5 w-5 shrink-0 text-primary' aria-hidden />
                <div className='flex flex-col gap-1'>
                  <Text as='p' className='font-serif text-base text-foreground'>
                    {title}
                  </Text>
                  <Text as='p' className='text-sm text-muted-foreground'>
                    {body}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className='flex justify-center md:justify-end'>
          <QuarantineMesh className='w-full max-w-sm text-primary' />
        </div>
      </div>
    </section>
  )
}
