'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { usesDocsShell } from './docs-shell-route'
import { useHeroLockupRegister } from './hero-lockup-context'
import { isLandingRoute } from './landing-route'

/**
 * The bar's controls — the nav, theme toggle and menu button — as one selector, without
 * naming anything inside the shared topbar: every element whose parent contains the lockup
 * (`HeroLockup.tsx`'s `data-hero-lockup`) but which neither is nor contains it. Those are the
 * siblings of each ancestor of the lockup, i.e. the bar's other top-level groups, however
 * deep the active UI library's `ChromeFrame` nests them. Their descendants never match (their
 * parent holds no lockup), so an opacity here is applied once per group, never compounded.
 *
 * `--bar-reveal` is the controls' opacity (unset, and so `1`, everywhere but landing);
 * `data-bar-hidden='true'` makes them `invisible`, which also takes them out of hit-testing
 * and the tab order. Both are written per frame by `lockup-flip.js` on landing.
 */
const CONTROLS_REVEAL_CLASS =
  '[&_:has([data-hero-lockup])>:not([data-hero-lockup]):not(:has([data-hero-lockup]))]:opacity-[var(--bar-reveal,1)] [&[data-bar-hidden=true]_:has([data-hero-lockup])>:not([data-hero-lockup]):not(:has([data-hero-lockup]))]:invisible'

/**
 * The color scheme toggle, which on landing stays hidden past the controls' ramp until the
 * lockup has docked (`data-bare` is `false`). `ColorSchemeToggle` (shared, untouched) carries
 * no data attribute, but its `title` is always `Switch to light mode` / `Switch to dark mode`
 * on both of its render paths, so `[title^=Switch][title$=mode]` finds it in the desktop
 * group and the mobile bar row. `invisible` also removes it from hit-testing and the tab
 * order. The menu sheet's copy is portalled outside the bar and is covered in
 * `hero-canvas/hero-core.css`.
 */
const TOGGLE_DOCK_CLASS = '[&[data-bare=true]_[title^=Switch][title$=mode]]:invisible'

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
 * `data-bar-hidden` follows the same rule for the bar's controls (`CONTROLS_REVEAL_CLASS`):
 * on landing they are hidden at rest and fade in as soon as scrolling starts
 * (`lockup-flip.js`'s `barReveal`), so the SSR'd value is `'true'` there — what the loop
 * computes at scroll progress 0 — and a hard reload never paints them before JS attaches.
 * Every other route SSRs `'false'` and never sets `--bar-reveal`, so its controls are fully
 * visible from first paint.
 *
 * The color scheme toggle follows `data-bare` itself (`TOGGLE_DOCK_CLASS`), so on landing it
 * is SSR'd hidden and appears in the same frame the lockup docks; elsewhere `data-bare` is
 * `'false'` and it is visible from first paint.
 *
 * Both SSR'd values hang on `isLandingRoute`, not a bare `pathname === '/'`: a background
 * regeneration of the prerendered landing page can render it under Next's internal
 * `/index` name, and a `'/'`-only test caches that HTML with the controls visible.
 *
 * Renders nothing on a docs-shell route (`usesDocsShell`): there the bar lives inside the
 * docs body, scoped to its width and without the logo, because the wordmark sits at the
 * top of the docs sidebar instead. Every other route gets this exact element unchanged.
 */
export function TopBarChromeHost({ children }: { children: ReactNode }) {
  const setNode = useHeroLockupRegister()
  const pathname = usePathname() ?? ''
  if (usesDocsShell(pathname)) return null
  const isLanding = isLandingRoute(pathname)

  return (
    <div
      ref={(el) => setNode('bar', el)}
      data-bare={isLanding ? 'true' : 'false'}
      data-bar-hidden={isLanding ? 'true' : 'false'}
      className={`fixed inset-x-0 top-0 z-30 ${CONTROLS_REVEAL_CLASS} ${TOGGLE_DOCK_CLASS}`}
    >
      {children}
    </div>
  )
}
