'use client'

import { createContext, type ReactNode, useContext } from 'react'

import type { ModelEntry } from './catalog'

const CatalogContext = createContext<ModelEntry[]>([])

export interface CatalogProviderProps {
  catalog: ModelEntry[]
  children: ReactNode
  className?: string
}

export function CatalogProvider({ catalog, children, className }: CatalogProviderProps) {
  return (
    <CatalogContext.Provider value={catalog}>
      <div className={className}>{children}</div>
    </CatalogContext.Provider>
  )
}

export function useCatalog(): ModelEntry[] {
  return useContext(CatalogContext)
}
