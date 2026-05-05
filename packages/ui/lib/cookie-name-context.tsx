'use client'

import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { COLOR_SCHEME_COOKIE } from './color-scheme'

const CookieNameContext = createContext<string>(COLOR_SCHEME_COOKIE)

export function CookieNameProvider({ cookieName, children }: { cookieName: string; children: ReactNode }) {
  return <CookieNameContext.Provider value={cookieName}>{children}</CookieNameContext.Provider>
}

export function useCookieName(): string {
  return useContext(CookieNameContext)
}
