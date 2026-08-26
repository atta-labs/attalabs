'use client'

import { Card, CardContent, Tabs, TabsList, TabsTrigger } from '@atta/ui/components'
import { Text } from '@atta/ui/shared'
import { useEffect, useRef, useState } from 'react'
import type { LifeCycleId } from '../_lib/life-cycles'
import { LIFE_CYCLE_SWITCHER_ANCHOR_ID, LIFE_CYCLES } from '../_lib/life-cycles'

// Same "find the nearest scrolling ancestor" pattern `LandingInteractions.tsx`'s
// `RevealGrid` uses — this app's scroll container is a `.overflow-y-auto` div in
// `(site)/layout.tsx`, never `window`.
function scrollParent(element: HTMLElement): HTMLElement | Window {
  let parent = element.parentElement
  while (parent) {
    const overflow = window.getComputedStyle(parent).overflowY
    if (overflow === 'auto' || overflow === 'scroll') return parent
    parent = parent.parentElement
  }
  return window
}

function scrollY(target: HTMLElement | Window): number {
  return target instanceof Window ? window.scrollY : target.scrollTop
}

// `sticky`, not `fixed` — this belongs to the panel content below it, not
// the page. It sits in normal flow at the top of the panels section, sticks
// to the top of the viewport while that section is in view, and scrolls
// away naturally with it once the reader passes it.
//
// Scrolling down collapses the full tab row into a single centered word —
// the active altitude's name — so it never fights scrolling content for
// space but always says where you are. Scrolling up expands it back into
// the real switcher. Same element, same position, the content itself
// morphs.
export function LifeCycleSwitcher({ active, onChange }: { active: LifeCycleId; onChange: (id: LifeCycleId) => void }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(false)
  const lastY = useRef(0)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const target = scrollParent(el)
    lastY.current = scrollY(target)

    let frame = 0
    const evaluate = () => {
      frame = 0
      const y = scrollY(target)
      const delta = y - lastY.current
      if (delta > 4) setCollapsed(true)
      else if (delta < -4) setCollapsed(false)
      lastY.current = y
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(evaluate)
    }
    target.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      target.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  const activeLabel = LIFE_CYCLES.find((cycle) => cycle.id === active)?.label ?? ''

  return (
    <div id={LIFE_CYCLE_SWITCHER_ANCHOR_ID} ref={wrapRef} className='sticky top-4 z-20 flex justify-center px-6 py-4'>
      <Card className='overflow-hidden'>
        <CardContent className='grid p-1.5 transition-[padding] duration-300'>
          <div
            className={`col-start-1 row-start-1 transition-all duration-300 ${
              collapsed ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
            }`}
            aria-hidden={collapsed}
            inert={collapsed || undefined}
          >
            <Tabs value={active} onValueChange={(value) => onChange(value as LifeCycleId)}>
              <TabsList>
                {LIFE_CYCLES.map((cycle) => (
                  <TabsTrigger key={cycle.id} value={cycle.id} className='w-32 justify-center'>
                    <Text as='span' className='font-mono text-xs uppercase tracking-widest'>
                      {cycle.label}
                    </Text>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <div
            className={`pointer-events-none col-start-1 row-start-1 flex items-center justify-center px-8 py-1.5 transition-all duration-300 ${
              collapsed ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
            }`}
            aria-hidden={!collapsed}
          >
            <Text as='span' className='font-mono text-xs uppercase tracking-widest'>
              {activeLabel}
            </Text>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
