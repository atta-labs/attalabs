'use client'

import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

interface HeroCollapseContextValue {
  isCollapsed: boolean
  setIsCollapsed: (val: boolean) => void
}

const HeroCollapseContext = createContext<HeroCollapseContextValue>({
  isCollapsed: false,
  setIsCollapsed: () => {}
})

export function HeroCollapseProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  return <HeroCollapseContext.Provider value={{ isCollapsed, setIsCollapsed }}>{children}</HeroCollapseContext.Provider>
}

export function useHeroCollapse() {
  return useContext(HeroCollapseContext)
}
