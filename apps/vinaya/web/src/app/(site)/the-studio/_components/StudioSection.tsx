import { Heading, Text } from '@atta/ui/shared'
import type { ReactNode } from 'react'

interface StudioSectionProps {
  eyebrow: string
  heading: string
  body: string
  shot: ReactNode
  id?: string
}

// One section per Studio view: eyebrow, display heading, body, then the shot — the shape
// this page repeats seven times. Content-height, not `min-h-screen` (seven full-viewport
// sections would make the page unusable to scan), wide and left-aligned so the shot and the
// prose beside it both read straight.
export function StudioSection({ eyebrow, heading, body, shot, id }: StudioSectionProps) {
  return (
    <section id={id} className='mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-6 py-16 text-left'>
      <div className='flex flex-col gap-3'>
        <Text as='span' className='font-mono text-sm font-bold uppercase tracking-[0.2em] text-primary'>
          {eyebrow}
        </Text>
        <Heading
          level={2}
          className='text-balance font-sans text-3xl leading-tight font-extrabold tracking-tight text-foreground sm:text-3xl md:text-4xl lg:text-5xl'
        >
          {heading}
        </Heading>
        <Text className='max-w-[680px] text-balance font-sans text-lg leading-relaxed text-muted-foreground'>
          {body}
        </Text>
      </div>
      {shot}
    </section>
  )
}
