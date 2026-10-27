'use client'

import { Heading, Text } from '@atta/ui/components'
import { animate, useInView, useMotionValue, useTransform, motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { stats, story } from '@/content/portfolio'
import { Reveal } from './Reveal'

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => Math.round(latest))

  useEffect(() => {
    if (!inView) return
    const controls = animate(count, value, { duration: 1.6, ease: 'easeOut' })
    return () => controls.stop()
  }, [inView, count, value])

  return (
    <span ref={ref}>
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  )
}

export function Story() {
  return (
    <section id='story' className='mx-auto max-w-3xl scroll-mt-16 px-6 py-24 sm:py-32'>
      <Reveal>
        <Text size='sm' className='mb-3 font-mono uppercase tracking-[0.3em] text-muted-foreground'>
          The story
        </Text>
        <Heading level={2} size='3xl' className='font-serif'>
          Fifteen years of engineering judgment, pointed at agents.
        </Heading>
      </Reveal>

      <div className='mt-10 space-y-6'>
        {story.map((paragraph, index) => (
          <Reveal key={paragraph.slice(0, 24)} delay={index * 0.1}>
            <Text size='lg' className='leading-relaxed text-foreground'>
              {paragraph}
            </Text>
          </Reveal>
        ))}
      </div>

      <dl className='mt-16 grid gap-8 border-t border-border pt-10 sm:grid-cols-3'>
        {stats.map((stat, index) => (
          <Reveal key={stat.label} delay={index * 0.12}>
            <dt className='sr-only'>{stat.label}</dt>
            <dd>
              <div className='font-serif text-5xl font-semibold text-primary'>
                <Counter value={stat.value} suffix={stat.suffix} />
              </div>
              <Text size='sm' className='mt-2 text-muted-foreground'>
                {stat.label}
              </Text>
            </dd>
          </Reveal>
        ))}
      </dl>
    </section>
  )
}
