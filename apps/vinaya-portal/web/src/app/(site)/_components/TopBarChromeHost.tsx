'use client'

import { usePathname } from 'next/navigation'
import { type ReactNode, useEffect, useRef } from 'react'
import { usesDocsShell } from './docs-shell-route'
import { useHeroLockupRegister } from './hero-lockup-context'
import { isLandingRoute } from './landing-route'

/**
 * The color scheme toggle, which on landing stays hidden until the lockup has docked
 * (`data-bare` is `false`). `ColorSchemeToggle` (shared, untouched) carries no data attribute,
 * but its `title` is always `Switch to light mode` / `Switch to dark mode` on both of its render
 * paths, so `[title^=Switch][title$=mode]` finds it in the desktop group and the mobile bar row.
 * The whole BUTTON is hidden, not just the titled node: the active UI library's toggle draws
 * its background as a separate `bg-accent` highlight element beside the titled node, and
 * hiding only the titled node left an empty box on screen. `invisible` also removes it from
 * hit-testing and the tab order. The menu sheet's copy is portalled outside the bar and is
 * covered in `hero-canvas/hero-core.css`.
 */
const TOGGLE_DOCK_CLASS =
  '[&[data-bare=true]_:is(button:has([title^=Switch][title$=mode]),[title^=Switch][title$=mode])]:invisible'

/**
 * While the lockup is in its hero state (`data-bare` is `true`) it is the big "Vinaya /
 * Development harness" title in the middle of the hero, but its DOM node still lives inside this
 * fixed bar. The page scrolls in `SiteContentPad`, which is a SIBLING of the bar, not its
 * ancestor, so a wheel or touch that starts on an element inside the bar has no scrollable
 * ancestor and scrolls nothing: the hero title felt blocked under the cursor. The lockup takes no
 * pointer events while bare, so the gesture lands on the hero beneath it; once it docks it is
 * the small logo link and is clickable again.
 */
const LOCKUP_BARE_CLASS = '[&[data-bare=true]_[data-hero-lockup]]:pointer-events-none'

/**
 * The same reason applies to the bar itself: its strip (and any open nav panel) sits over the
 * content but outside the scroller, so a wheel or a touch drag that starts on it scrolled
 * nothing. A wheel or a vertical drag on the bar is handed to the scroller (`[data-site-scroll]`).
 * Nothing is prevented, so clicks, taps and hover menus behave as before.
 */
function useForwardScrollToPage(barRef: { current: HTMLElement | null }, pathname: string) {
  // `pathname` is a dependency on purpose: the bar unmounts on docs routes, so the listeners follow the route
  useEffect(() => {
    const bar = barRef.current
    if (!bar) return
    const page = () => document.querySelector<HTMLElement>('[data-site-scroll]')
    const onWheel = (event: WheelEvent) => {
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1
      page()?.scrollBy({ top: event.deltaY * unit, left: event.deltaX * unit })
    }
    let lastY = 0
    const onTouchStart = (event: TouchEvent) => {
      lastY = event.touches[0]?.clientY ?? 0
    }
    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0]
      if (!touch) return
      page()?.scrollBy({ top: lastY - touch.clientY })
      lastY = touch.clientY
    }
    bar.addEventListener('wheel', onWheel, { passive: true })
    bar.addEventListener('touchstart', onTouchStart, { passive: true })
    bar.addEventListener('touchmove', onTouchMove, { passive: true })
    return () => {
      bar.removeEventListener('wheel', onWheel)
      bar.removeEventListener('touchstart', onTouchStart)
      bar.removeEventListener('touchmove', onTouchMove)
    }
  }, [barRef, pathname])
}

/**
 * Replaces the plain `<div className='relative z-30'>` wrapper around the topbar. Fixed
 * to the viewport top (not in normal flow) so the hero section can sit flush at the true
 * page top and paint its canvas underneath — that's what makes `chromeClassName`'s
 * transparency actually show fabric through the bar instead of blurring nothing. Every
 * other route compensates with `SiteContentPad`'s `pt-14`, carried on the shell's scroll
 * container itself (see its own doc comment for how that interacts with `sticky`).
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
 *
 * The bar's nav and menu button are visible from the first render, over the transparent bare
 * bar. Only the color scheme toggle follows `data-bare` (`TOGGLE_DOCK_CLASS`), so on landing it
 * is SSR'd hidden and appears in the same frame the lockup docks; elsewhere `data-bare` is
 * `'false'` and it is visible from first paint.
 *
 * The SSR'd `data-bare` hangs on `isLandingRoute`, not a bare `pathname === '/'`: a background
 * regeneration of the prerendered landing page can render it under Next's internal
 * `/index` name, and a `'/'`-only test caches that HTML with the toggle visible.
 *
 * Renders nothing on a docs-shell route (`usesDocsShell`): there the bar lives inside the
 * docs body, scoped to its width and without the logo, because the wordmark sits at the
 * top of the docs sidebar instead. Every other route gets this exact element unchanged.
 */
export function TopBarChromeHost({ children }: { children: ReactNode }) {
  const setNode = useHeroLockupRegister()
  const pathname = usePathname() ?? ''
  const barRef = useRef<HTMLDivElement | null>(null)
  useForwardScrollToPage(barRef, pathname)
  if (usesDocsShell(pathname)) return null
  const isLanding = isLandingRoute(pathname)

  return (
    <div
      ref={(el) => {
        barRef.current = el
        setNode('bar', el)
      }}
      data-bare={isLanding ? 'true' : 'false'}
      className={`fixed inset-x-0 top-0 z-30 ${TOGGLE_DOCK_CLASS} ${LOCKUP_BARE_CLASS}`}
    >
      {children}
    </div>
  )
}
