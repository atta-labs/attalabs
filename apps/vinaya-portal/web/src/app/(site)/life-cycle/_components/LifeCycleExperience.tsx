'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import type { LifeCycleId } from '../_lib/life-cycles'
import { scrollToPanelStart } from '../_lib/scroll-to-panel-start'
import { LifeCycleHero3D } from './LifeCycleHero3D'
import { LifeCyclePanels } from './LifeCyclePanels'

// The hero and the panels below run two separate, unsynced altitude states, by
// design: the hero's is continuous and driven by scroll progress through its own
// section, the switcher's is a discrete tab the reader chose. Wiring one to the
// other would make a scroll position silently reselect a tab the reader picked.
export function LifeCycleExperience() {
  const [active, setActive] = useState<LifeCycleId>('milestone')
  // Bumped on every altitude change so the scroll runs once per request, after
  // the new panel has committed — never on first mount.
  const [scrollRequest, setScrollRequest] = useState(0)
  const switcherRef = useRef<HTMLDivElement>(null)
  const panelStartRef = useRef<HTMLElement>(null)

  // Every control that changes altitude (the switcher's tabs, a panel's
  // handoff button) goes through here, so the reader always lands at the
  // top of the new panel's first section instead of wherever they'd scrolled to.
  const handleChange = (id: LifeCycleId) => {
    setActive(id)
    setScrollRequest((n) => n + 1)
  }

  useLayoutEffect(() => {
    if (scrollRequest === 0) return
    const section = panelStartRef.current
    const switcher = switcherRef.current
    if (section && switcher) scrollToPanelStart(section, switcher)
  }, [scrollRequest])

  return (
    <>
      <LifeCycleHero3D />

      <LifeCyclePanels
        active={active}
        onChange={handleChange}
        switcherRef={switcherRef}
        panelStartRef={panelStartRef}
      />
    </>
  )
}
