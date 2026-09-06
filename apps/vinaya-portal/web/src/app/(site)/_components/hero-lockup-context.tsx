'use client'

import { createContext, type ReactNode, useCallback, useContext, useRef } from 'react'

/**
 * The single lockup mechanism from TOPBAR-LOCKUP.md: there is exactly one lockup node in
 * the DOM, owned by the topbar, and the landing hero only ever writes a `transform` onto
 * it (via `lockup-flip.js`'s `attachLockupFlip`). This context is the wiring that lets two
 * DOM-owning components that don't render inside each other — `HeroLockup` inside the
 * topbar, `VinayaHeroEmblem` inside the page — reach the same real nodes.
 *
 * Registration is via callback refs, not `useRef` + `useEffect`: callback refs fire during
 * React's commit phase, before any component's effects run, regardless of where in the
 * tree the ref-holding element sits. That ordering guarantee is what lets the hero's own
 * mount effect read fully-populated nodes on its very first run, with no subscription or
 * re-render needed — `getNodes()` reads a plain mutable object, not React state.
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
