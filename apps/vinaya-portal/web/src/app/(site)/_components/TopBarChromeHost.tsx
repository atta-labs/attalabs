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
 * `data-bare` onto — the bare-state flag described in `hero-lockup-context.tsx`. The
 * SSR'd initial value is derived from the route, not hardcoded `'false'`: on landing the
 * cold-open STARTS bare (`lockup-flip.js` computes `bare='true'` at scroll progress 0, via
 * its `docked = p >= TRAVEL_END` condition), and the loop attaches only once the hero's
 * mount effect runs. A hardcoded `'false'` renders a fully chromed, bordered bar with the
 * small resting logo for that gap — a visible flash. Matching the SSR value to the value
 * the loop converges to removes the flash instead of shortening it. No other route has JS
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
