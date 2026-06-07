'use client'

import { createContext, useContext, useEffect } from 'react'
import { type ComponentMap, type UILibrary, useLibraryLoader } from './library-loader'

const LibraryContext = createContext<ComponentMap>({})

export function LibraryProvider({ library, children }: { library: UILibrary; children: React.ReactNode }) {
  const { components, loadLibrary } = useLibraryLoader()

  useEffect(() => {
    loadLibrary(library)
  }, [library, loadLibrary])

  useEffect(() => {
    document.documentElement.dataset.library = library
    return () => {
      delete document.documentElement.dataset.library
    }
  }, [library])

  return <LibraryContext.Provider value={components}>{children}</LibraryContext.Provider>
}

/**
 * Access the currently loaded library components.
 * Returns a ComponentMap with Button, Card, Input, etc.
 */
export function useComponents() {
  return useContext(LibraryContext)
}
