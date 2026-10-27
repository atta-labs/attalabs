'use client'

import { Badge, Heading, Text } from '@atta/ui/components'
import { motion, useScroll, useSpring } from 'motion/react'
import { useRef } from 'react'
import { career } from '@/content/portfolio'
import { Reveal } from './Reveal'

export function CareerTimeline() {
  const listRef = useRef<HTMLOListElement>(null)
  // The thread fills as the list scrolls through the middle of the viewport.
  const { scrollYProgress } = useScroll({ target: listRef, offset: ['start 60%', 'end 60%'] })
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 })

  return (
    <section id='career' className='mx-auto max-w-3xl scroll-mt-16 px-6 py-24 sm:py-32'>
      <Reveal>
        <Text size='sm' className='mb-3 font-mono uppercase tracking-[0.3em] text-muted-foreground'>
          The career
        </Text>
        <Heading level={2} size='3xl' className='font-serif'>
          From booking engines to agent harnesses.
        </Heading>
      </Reveal>

      <div className='relative mt-14'>
        <div aria-hidden className='absolute top-1 bottom-1 left-[5px] w-px bg-border' />
        <motion.div
          aria-hidden
          className='absolute top-1 bottom-1 left-[5px] w-px origin-top bg-primary'
          style={{ scaleY: progress }}
        />

        <ol ref={listRef} className='space-y-12 pl-8 sm:pl-10'>
          {career.map((entry) => (
            <li key={`${entry.company}-${entry.period}`} className='relative'>
              <motion.span
                aria-hidden
                className='absolute top-1.5 -left-8 h-[11px] w-[11px] rounded-full border-2 border-primary bg-background sm:-left-10'
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true, margin: '0px 0px -40% 0px' }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              />
              <Reveal>
                <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
                  <span className='font-mono text-xs text-muted-foreground'>{entry.period}</span>
                  <Badge variant='outline'>{entry.place}</Badge>
                </div>
                <Heading level={3} size='lg' className='mt-2 font-serif'>
                  {entry.role} <span className='text-muted-foreground'>· {entry.company}</span>
                </Heading>
                <Text className='mt-2 text-muted-foreground'>{entry.summary}</Text>
              </Reveal>
            </li>
          ))}

          <li className='relative'>
            <span
              aria-hidden
              className='absolute top-1.5 -left-8 h-[11px] w-[11px] rounded-full border-2 border-border bg-background sm:-left-10'
            />
            <Reveal>
              <span className='font-mono text-xs text-muted-foreground'>2001 — 2008</span>
              <Heading level={3} size='lg' className='mt-2 font-serif'>
                Computer Science Engineering{' '}
                <span className='text-muted-foreground'>· Polytechnic University of Madrid</span>
              </Heading>
            </Reveal>
          </li>
        </ol>
      </div>
    </section>
  )
}
