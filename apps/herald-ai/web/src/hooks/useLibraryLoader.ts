'use client'

import type { ComponentType } from 'react'
import { useCallback, useRef, useState } from 'react'

export type UILibrary = 'basic' | 'animate' | 'retro' | 'brutal'

export type ComponentMap = Record<string, ComponentType<any>>

const LIBRARY_IMPORTERS: Record<UILibrary, () => Promise<Record<string, unknown>>> = {
  basic: () => import('@herald/ui/basic/components'),
  animate: () => import('@herald/ui/animate/components'),
  retro: () => import('@herald/ui/retro/components'),
  brutal: () => import('@herald/ui/brutal/components')
}

/**
 * Dynamic import of UI component libraries.
 * Guards against race conditions — a slower import won't overwrite a later one.
 *
 * Copied from Summon's useLibraryLoader pattern.
 */
export function useLibraryLoader() {
  const [components, setComponents] = useState<ComponentMap>({})
  const loadedLibraryRef = useRef<UILibrary | null>(null)

  const loadLibrary = useCallback((library: UILibrary) => {
    if (loadedLibraryRef.current === library) return
    loadedLibraryRef.current = library
    LIBRARY_IMPORTERS[library]()
      .then((mod) => {
        if (loadedLibraryRef.current !== library) return
        setComponents(mod as unknown as ComponentMap)
      })
      .catch((err) => {
        console.error(`[useLibraryLoader] Failed to load "${library}" library:`, err)
      })
  }, [])

  return { components, loadLibrary }
}
