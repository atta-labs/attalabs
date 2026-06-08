'use client'

import { createContext, useContext, useEffect } from 'react'
import { type ComponentMap, type UILibrary, useLibraryLoader } from './library-loader'

const LibraryContext = createContext<ComponentMap>({})
const LibraryNameContext = createContext<UILibrary>('basic')

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

  return (
    <LibraryNameContext.Provider value={library}>
      <LibraryContext.Provider value={components}>{children}</LibraryContext.Provider>
    </LibraryNameContext.Provider>
  )
}

export function useComponents() {
  return useContext(LibraryContext)
}

export function useLibraryName() {
  return useContext(LibraryNameContext)
}
