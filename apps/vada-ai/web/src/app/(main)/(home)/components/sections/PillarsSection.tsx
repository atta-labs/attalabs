'use client'

import { Card, CardContent, Text } from '@atta/ui'
import { EyeOff, KeyRound, Split } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Pillar {
  icon: LucideIcon
  title: string
  body: string
}

const PILLARS: Pillar[] = [
  {
    icon: KeyRound,
    title: 'Total BYOK Flexibility',
    body: 'Your intelligence, your terms. Integrate Gemini, Claude, or Llama using your own API credentials. No hidden overheads or proprietary locks.'
  },
  {
    icon: Split,
    title: 'Structured Debate',
    body: 'Multi-agent, multi-round deliberation protocols. Pressure-test ideas through adversarial synthesis, forcing models to find the logical consensus.'
  },
  {
    icon: EyeOff,
    title: 'Ephemeral Sessions',
    body: 'Zero persistent memory. Every session is a clean slate designed for deep, one-time focus. When the tab closes, the intellectual footprint vanishes.'
  }
]

export function PillarsSection() {
  return (
    <section className='bg-background py-24 md:py-32'>
      <div className='mx-auto max-w-6xl px-6'>
        <div className='grid gap-6 md:grid-cols-3'>
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <Card key={title} className='bg-card border-border'>
              <CardContent className='flex flex-col gap-4 p-6'>
                <Icon className='h-5 w-5 text-primary' aria-hidden />
                <Text as='p' className='font-serif text-lg text-foreground'>
                  {title}
                </Text>
                <Text as='p' className='text-sm text-muted-foreground'>
                  {body}
                </Text>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
