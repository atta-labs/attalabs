'use client'

import { createContext, useContext } from 'react'
import type { CMSTheme } from '@atta/cms'

interface ThemeContextValue {
  theme: CMSTheme | null
  styleId: string
}

const ThemeContext = createContext<ThemeContextValue>({ theme: null, styleId: '' })

export function ThemeProvider({
  theme,
  styleId,
  children
}: {
  theme: CMSTheme | null
  styleId: string
  children: React.ReactNode
}) {
  return <ThemeContext.Provider value={{ theme, styleId }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
