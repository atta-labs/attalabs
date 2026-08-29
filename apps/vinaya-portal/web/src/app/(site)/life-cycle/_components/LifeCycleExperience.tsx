'use client'

import { useState } from 'react'
import { LIFE_CYCLE_SWITCHER_ANCHOR_ID } from '../_lib/life-cycles'
import type { LifeCycleId } from '../_lib/life-cycles'
import { LifeCycleHero3D } from './LifeCycleHero3D'
import { LifeCyclePanels } from './LifeCyclePanels'

// The hero and the panels below run two separate, unsynced altitude states, by
// design: the hero's is continuous and driven by scroll progress through its own
// section, the switcher's is a discrete tab the reader chose. Wiring one to the
// other would make a scroll position silently reselect a tab the reader picked.
export function LifeCycleExperience() {
  const [active, setActive] = useState<LifeCycleId>('milestone')

  // Every control that changes altitude (the switcher's tabs, a panel's
  // handoff button) goes through here, so the reader always lands at the
  // top of the new panel instead of wherever they'd scrolled to.
  const handleChange = (id: LifeCycleId) => {
    document.getElementById(LIFE_CYCLE_SWITCHER_ANCHOR_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActive(id)
  }

  return (
    <>
      <LifeCycleHero3D />

      <LifeCyclePanels active={active} onChange={handleChange} />
    </>
  )
}
