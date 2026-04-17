'use client'

import { createContext, type ReactNode, useContext } from 'react'

import type { ModelEntry } from './catalog'

const CatalogContext = createContext<ModelEntry[]>([])

export interface CatalogProviderProps {
  catalog: ModelEntry[]
  children: ReactNode
}

export function CatalogProvider({ catalog, children }: CatalogProviderProps) {
  return <CatalogContext.Provider value={catalog}>{children}</CatalogContext.Provider>
}

export function useCatalog(): ModelEntry[] {
  return useContext(CatalogContext)
}
