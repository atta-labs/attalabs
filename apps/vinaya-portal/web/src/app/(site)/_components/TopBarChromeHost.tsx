'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useHeroLockupRegister } from './hero-lockup-context'

/**
 * Replaces the plain `<div className='relative z-30'>` wrapper around the topbar. Fixed
 * to the viewport top (not in normal flow) so the hero section can sit flush at the true
 * page top and paint its canvas underneath — that's what makes `chromeClassName`'s
 * transparency actually show fabric through the bar instead of blurring nothing. Every
 * other route compensates with `SiteContentPad`'s `pt-14` (see its own doc comment for why
 * that padding can't live on the scroll container itself).
 *
 * Registers itself as the `bar` node the landing hero's `attachLockupFlip` writes
 * `data-bare` onto — see TOPBAR-LOCKUP.md's bare-state table. The initial value is derived
 * from the route, not hardcoded `'false'`: on landing, the hero's cold-open STARTS bare
 * (`attachLockupFlip`'s own `frame()` computes `bare='true'` at scroll progress 0 — see
 * `lockup-flip.js`'s `docked = p >= TRAVEL_END` condition), and `attachLockupFlip` only
 * attaches once its dynamic `import()` resolves. A hardcoded `'false'` default rendered a
 * fully chromed, bordered bar with the small resting logo for that gap — a real, visible
 * flash, not a theoretical one. Matching the route-derived value to the value the effect
 * converges to
 * removes the flash instead of merely shortening it. Every other route's bar has no JS
 * that ever un-sets `'false'`, so this is a no-op there.
 */
export function TopBarChromeHost({ children }: { children: ReactNode }) {
  const setNode = useHeroLockupRegister()
  const isLanding = (usePathname() ?? '') === '/'

  return (
    <div
      ref={(el) => setNode('bar', el)}
      data-bare={isLanding ? 'true' : 'false'}
      className='fixed inset-x-0 top-0 z-30'
    >
      {children}
    </div>
  )
}
