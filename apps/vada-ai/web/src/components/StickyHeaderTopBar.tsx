'use client'

import { cn } from '@atta/ui/lib/utils'
import { usePathname } from 'next/navigation'
import { type ReactNode, useEffect, useState } from 'react'

// Scroll progress through the home hero's track at which the bar stops being bare — Vinaya's
// `lockup-flip.js` TRAVEL_END, where its wordmark docks into the bar.
const DOCK_AT = 0.42

/* While bare, the colour scheme toggle and the logo are hidden — Vinaya's TOGGLE_DOCK_CLASS
   selector (ColorSchemeToggle carries no attribute of its own, so it is matched by its title). */
const BARE_HIDE_CLASS =
  '[&[data-bare=true]_:is(button:has([title^=Switch][title$=mode]),[title^=Switch][title$=mode])]:invisible [&[data-bare=true]_[data-topbar-logo]]:invisible'

function useHeroBare(active: boolean) {
  const [bare, setBare] = useState(active)
  useEffect(() => {
    if (!active) {
      setBare(false)
      return
    }
    const check = () => {
      const track = document.getElementById('hero')
      if (!track) return setBare(false)
      const r = track.getBoundingClientRect()
      const travel = r.height - window.innerHeight
      const p = travel <= 20 ? 0 : Math.max(0, Math.min(1, -r.top / travel))
      setBare(p < DOCK_AT)
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => {
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [active])
  return bare
}

// On the home page the bar is fixed over the hero (so the hero's fabric paints underneath it)
// and `data-bare` while the hero is in its opening state; the TopBar's `chromeClassName` keys
// its transparency off that attribute. Everywhere else it is the usual sticky, blurred bar.
export function StickyHeaderTopBar({
  children,
  className,
  isBlurred = true
}: {
  children: ReactNode
  className?: string
  isBlurred?: boolean
}) {
  const isHome = usePathname() === '/'
  const bare = useHeroBare(isHome)

  return (
    <header
      data-bare={isHome && bare ? 'true' : 'false'}
      className={cn(
        'top-0 h-14 flex items-center',
        isHome ? 'fixed inset-x-0' : 'sticky',
        isBlurred && !(isHome && bare) && 'bg-background/40 backdrop-blur-md',
        BARE_HIDE_CLASS,
        className
      )}
    >
      {children}
    </header>
  )
}
