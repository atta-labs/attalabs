'use client'

import { createContext, type ReactNode, useCallback, useContext, useRef } from 'react'

/**
 * The single-lockup mechanism, as specified by the Principal-supplied topbar-lockup
 * handoff (a design document handed over at dispatch and never committed — the task's
 * standing rule for design handoffs). Restated here because this file is the mechanism's
 * home and there is no in-repo copy of the handoff to point at:
 *
 *   There is exactly one lockup in the DOM, and the topbar owns it. The hero renders no
 *   wordmark; it only writes a `transform` onto the topbar's lockup node (via
 *   `lockup-flip.js`'s `attachLockupFlip`). At the end of the scroll that transform is
 *   `none`, so the landing is exact by construction — the element was never anywhere else.
 *
 *   Over the hero the topbar is the same component, same layout, same position — stripped
 *   ("bare"): bottom border and background transparent, the mark's slot `width: 0;
 *   opacity: 0`. Docked: border and background back, mark slot open. Nothing is unmounted,
 *   `display: none`d, or swapped.
 *
 * One rule departs from that handoff, by a later Principal decision: the color scheme toggle is
 * hidden until the lockup docks (`data-bare` flips to `false`) and appears then
 * (`TopBarChromeHost`'s `TOGGLE_DOCK_CLASS`, which hides the toggle's whole button so no empty
 * box is left behind). The nav and the menu button stay visible and clickable from the first
 * render, over the transparent bare bar, as the handoff had it. The background and border
 * still follow `data-bare` alone.
 *
 * `data-bare` on `TopBarChromeHost` is that bare flag, and `lockup-flip.js` is its only
 * writer; the chrome it gates is Vinaya's own `chromeClassName` string in
 * `(site)/layout.tsx`, not the shared `ChromeFrame`. The flag is SSR'd per route
 * (`isLandingRoute`, which also matches Next's internal `/index` name for the root page) so
 * landing's first paint already matches the loop's first frame. While bare that chrome also drops its backdrop blur, so the hero fabric
 * reaches the top edge. This context is the wiring that lets
 * two DOM-owning components that don't render inside each other — `HeroLockup` inside the
 * topbar, `VinayaHeroEmblem` inside the page — reach the same real nodes.
 *
 * Registration is via callback refs, not `useRef` + `useEffect`: callback refs fire during
 * React's commit phase, before any component's effects run, regardless of where in the
 * tree the ref-holding element sits. That ordering guarantee is what lets the hero's own
 * mount effect read fully-populated nodes on its very first run, with no subscription or
 * re-render needed — `getNodes()` reads a plain mutable object, not React state.
 *
 * Because the nodes outlive the hero, every inline style the hero writes onto them is the
 * hero's to undo: its unmount cleanup calls `lockup-flip.js`'s `resetLockup` after stopping
 * the loop, so no other route ever inherits a mid-animation transform. The cleanup acts on
 * the nodes the hero captured at attach time, not on a fresh `getNodes()` read: a second
 * `HeroLockup` instance (the mobile menu sheet renders the `logo` slot again) re-registers
 * these keys while it's open and nulls them when it closes.
 */

type LockupNodeKey = 'lockup' | 'word' | 'desc' | 'mark' | 'bar'
type LockupNodes = Record<LockupNodeKey, HTMLElement | null>

interface HeroLockupContextValue {
  setNode: (key: LockupNodeKey, el: HTMLElement | null) => void
  getNodes: () => LockupNodes
}

const HeroLockupContext = createContext<HeroLockupContextValue | null>(null)

export function HeroLockupProvider({ children }: { children: ReactNode }) {
  const nodesRef = useRef<LockupNodes>({ lockup: null, word: null, desc: null, mark: null, bar: null })
  const setNode = useCallback((key: LockupNodeKey, el: HTMLElement | null) => {
    nodesRef.current[key] = el
  }, [])
  const getNodes = useCallback(() => nodesRef.current, [])

  return <HeroLockupContext.Provider value={{ setNode, getNodes }}>{children}</HeroLockupContext.Provider>
}

/** For components that OWN a lockup node (the topbar's lockup, its chrome bar). */
export function useHeroLockupRegister() {
  const ctx = useContext(HeroLockupContext)
  if (!ctx) throw new Error('useHeroLockupRegister must be used within a HeroLockupProvider')
  return ctx.setNode
}

/** For the hero, which reads the registered nodes once and drives them via rAF. */
export function useHeroLockupNodes() {
  const ctx = useContext(HeroLockupContext)
  if (!ctx) throw new Error('useHeroLockupNodes must be used within a HeroLockupProvider')
  return ctx.getNodes
}
