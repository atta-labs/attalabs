'use client'

import { useState } from 'react'
import { ArrowDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { Heading } from '@atta/ui/shared'
import { RandomQuestionText } from './RandomQuestionText'
import { ScrollButton } from './ScrollButton'

export function HeroSection() {
  const [bulletsRevealed, setBulletsRevealed] = useState(false)

  return (
    // min-h-[100vh] would push the section's bottom edge past the viewport by however
    // tall the topbar above it is (the topbar sits in normal flow, not overlaid) —
    // subtracting its measured height is what actually makes this "the whole screen,
    // nothing else" instead of 100vh-plus-topbar.
    // justify-start + a fixed top offset (not justify-center) — centering re-balances
    // around the WHOLE block's height, so as RandomQuestionText's bullets grow the
    // midpoint shifts and the H1/subheadline above visibly drift. Anchoring to the top
    // means only content BELOW the bullets (the button) moves as they reveal, never H1.
    <section className='flex min-h-[calc(100vh-64px)] w-full flex-col items-center gap-6 px-6 pt-14 pb-8 text-center sm:pt-20'>
      <Heading
        level={1}
        className='text-balance font-sans text-3xl leading-tight font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl'
      >
        Sustainable software development
        <br />
        for the <span className='rounded-lg bg-accent px-3'>AI era</span>.
      </Heading>
      <Heading
        level={2}
        className='max-w-[900px] text-balance font-sans text-xl font-bold text-accent sm:text-2xl md:text-3xl'
      >
        Code generation is free.
        <br />
        Engineering oversight is priceless.
      </Heading>

      <RandomQuestionText onAllRevealed={() => setBulletsRevealed(true)} />

      {/* Fades in once RandomQuestionText reports the last bullet's own cascade has
          finished — no fixed delay, since it now depends on the (random) questions'
          actual word counts. Follows immediately in normal flow — the bullets box no
          longer reserves worst-case height, so there's no leftover gap to pull out of. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: bulletsRevealed ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      >
        <ScrollButton targetId='eras' className='gap-2 rounded-xl px-8 py-3.5 text-lg sm:text-xl'>
          Show me more
          <ArrowDown className='size-5' />
        </ScrollButton>
      </motion.div>
    </section>
  )
}
