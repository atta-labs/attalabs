'use client'

import { Button, Text, TextReveal } from '@atta/ui/components'
import { ArrowDown, ArrowUpRight } from 'lucide-react'
import { motion } from 'motion/react'
import { links, profile } from '@/content/portfolio'

export function Hero() {
  return (
    <section className='relative flex min-h-svh flex-col items-center justify-center px-6 text-center'>
      <motion.div
        className='mb-6 font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {profile.role} · {profile.location}
      </motion.div>

      <h1 className='font-serif text-5xl font-semibold leading-tight text-foreground sm:text-7xl'>
        <TextReveal text={profile.name} />
      </h1>

      <motion.div
        className='mt-8 max-w-2xl'
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
      >
        <Text size='lg' className='text-muted-foreground'>
          {profile.thesis}
        </Text>
      </motion.div>

      <motion.div
        className='mt-10 flex flex-wrap items-center justify-center gap-3'
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.9 }}
      >
        {links.map((link) => (
          <Button key={link.href} asChild variant='outline'>
            <a href={link.href} target='_blank' rel='noreferrer'>
              {link.label}
              <ArrowUpRight className='h-4 w-4' />
            </a>
          </Button>
        ))}
      </motion.div>

      <motion.a
        href='#story'
        aria-label='Scroll to story'
        className='absolute bottom-10 text-muted-foreground transition-colors hover:text-primary'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{ opacity: { delay: 1.4 }, y: { duration: 2, repeat: Number.POSITIVE_INFINITY, delay: 1.4 } }}
      >
        <ArrowDown className='h-5 w-5' />
      </motion.a>
    </section>
  )
}
