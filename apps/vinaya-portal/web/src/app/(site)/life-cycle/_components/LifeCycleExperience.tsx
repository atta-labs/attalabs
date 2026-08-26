'use client'

import { Text } from '@atta/ui/shared'
import { useState } from 'react'
import { LetterReveal } from '../../_components/LetterReveal'
import { LandingSection } from '../../_components/landing/LandingSection'
import { SectionOverline, SectionTitle } from '../../_components/landing/SectionHeading'
import { LIFE_CYCLE_SWITCHER_ANCHOR_ID } from '../_lib/life-cycles'
import type { LifeCycleId } from '../_lib/life-cycles'
import { HERO_CONTENT } from '../_lib/lifecycle-content'
import { LifeCyclePanels } from './LifeCyclePanels'
import { LifeCycleWordFlow } from './LifeCycleWordFlow'

// Hero and panels share one `active` altitude here so the hero's word-flow
// always names the switcher's real current tab below it — never a word the
// switcher disagrees with.
export function LifeCycleExperience() {
  const [active, setActive] = useState<LifeCycleId>('milestone')
  const [interacted, setInteracted] = useState(false)

  // Every control that changes altitude (the switcher's tabs, a panel's
  // handoff button) goes through here, so the reader always lands at the
  // top of the new panel instead of wherever they'd scrolled to.
  const handleChange = (id: LifeCycleId) => {
    setInteracted(true)
    document.getElementById(LIFE_CYCLE_SWITCHER_ANCHOR_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActive(id)
  }

  return (
    <>
      {/* min-h-svh: the hero fills the viewport, so the panels section (and
          its switcher) genuinely requires a scroll to reach — it must never
          just sit pre-visible below a short hero with no interaction. */}
      <LandingSection
        background='bg-background text-foreground'
        py='spacious'
        center
        className='flex min-h-svh flex-col justify-center'
      >
        <SectionOverline className='text-muted-foreground'>{HERO_CONTENT.overline}</SectionOverline>
        <SectionTitle className='mx-auto mt-5 max-w-4xl text-5xl sm:text-6xl lg:text-7xl'>
          <LetterReveal text={HERO_CONTENT.title} />
        </SectionTitle>
        <div className='mx-auto mt-7 flex max-w-xl justify-center gap-3.5'>
          {HERO_CONTENT.words.map((word, index) => (
            <span key={word} className='flex items-center gap-3.5'>
              {index > 0 && (
                <Text as='span' size='lg' muted className='font-mono uppercase tracking-[0.28em]'>
                  ·
                </Text>
              )}
              <Text as='span' size='lg' className='font-mono uppercase tracking-[0.28em]'>
                {word}
              </Text>
            </span>
          ))}
        </div>
        <div className='mt-12'>
          <LifeCycleWordFlow active={active} interacted={interacted} />
        </div>
      </LandingSection>

      <LifeCyclePanels active={active} onChange={handleChange} />
    </>
  )
}
