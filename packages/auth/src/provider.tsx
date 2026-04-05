'use client'

import { ClerkProvider as BaseClerkProvider } from '@clerk/nextjs'
import type { ReactNode } from 'react'

export function AuthProvider({ children }: { children: ReactNode }) {
  return <BaseClerkProvider>{children}</BaseClerkProvider>
}
