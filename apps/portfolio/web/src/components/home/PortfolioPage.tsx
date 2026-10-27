'use client'

import { Separator, Text } from '@atta/ui/components'
import { ColorSchemeToggle } from '@atta/ui/lib/color-scheme-toggle'
import { MotionConfig, motion, useScroll, useSpring } from 'motion/react'
import { links, profile } from '@/content/portfolio'
import { CareerTimeline } from './CareerTimeline'
import { Hero } from './Hero'
import { ProductGrid } from './ProductGrid'
import { Reveal } from './Reveal'
import { Story } from './Story'

const NAV = [
  { href: '#story', label: 'Story' },
  { href: '#career', label: 'Career' },
  { href: '#products', label: 'Products' }
]

export function PortfolioPage() {
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 })

  return (
    // `reducedMotion='user'` drops every transform/layout animation below for visitors
    // who ask the OS for reduced motion; opacity fades stay.
    <MotionConfig reducedMotion='user'>
      <motion.div
        aria-hidden
        className='fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-primary'
        style={{ scaleX: progress }}
      />

      <header className='fixed inset-x-0 top-0 z-40 border-b border-border bg-background/80 backdrop-blur'>
        <nav className='mx-auto flex h-14 max-w-5xl items-center justify-between px-6'>
          <a href='#top' className='font-serif text-sm font-semibold text-foreground'>
            {profile.name}
          </a>
          <div className='flex items-center gap-5'>
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className='hidden text-sm text-muted-foreground transition-colors hover:text-primary sm:inline'
              >
                {item.label}
              </a>
            ))}
            <ColorSchemeToggle />
          </div>
        </nav>
      </header>

      <main id='top'>
        <Hero />
        <Separator className='mx-auto max-w-3xl' />
        <Story />
        <Separator className='mx-auto max-w-3xl' />
        <CareerTimeline />
        <Separator className='mx-auto max-w-3xl' />
        <ProductGrid />
      </main>

      <footer className='border-t border-border px-6 py-16'>
        <Reveal className='mx-auto flex max-w-5xl flex-col items-center gap-6 text-center'>
          <Text className='font-serif text-2xl text-foreground'>Let’s build something that holds.</Text>
          <div className='flex flex-wrap justify-center gap-5'>
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target='_blank'
                rel='noreferrer'
                className='text-sm text-muted-foreground transition-colors hover:text-primary'
              >
                {link.label}
              </a>
            ))}
          </div>
          <Text size='xs' className='font-mono text-muted-foreground'>
            {profile.name} · {profile.location}
          </Text>
        </Reveal>
      </footer>
    </MotionConfig>
  )
}
