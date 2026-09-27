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
 * One rule departs from that handoff, by a later Principal decision: the handoff kept the
 * nav and theme toggle visible and clickable throughout the bare phase. Now, at rest on
 * landing (scroll progress 0), the bar's controls — nav, theme toggle, menu button — are
 * hidden and not interactive, and they fade in continuously from the first pixel of scroll,
 * the same instant the lockup starts its flight, reaching full opacity early in it
 * (`lockup-flip.js`'s `barReveal` / `FLIP.BAR_REVEAL_END`). The lockup itself is never
 * faded by this: the reveal targets the bar's other groups only (`TopBarChromeHost`'s
 * `CONTROLS_REVEAL_CLASS`). The background and border still follow `data-bare` alone.
 *
 * `data-bare` on `TopBarChromeHost` is that bare flag, and `lockup-flip.js` is its only
 * writer; the chrome it gates is Vinaya's own `chromeClassName` string in
 * `(site)/layout.tsx`, not the shared `ChromeFrame`. `data-bar-hidden` and the inline
 * `--bar-reveal` on the same node carry the controls' reveal, with the same single writer.
 * Both flags are SSR'd per route so landing's first paint already matches the loop's first
 * frame. This context is the wiring that lets
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
