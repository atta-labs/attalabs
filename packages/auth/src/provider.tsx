'use client'

import { ClerkProvider as BaseClerkProvider } from '@clerk/nextjs'
import type { ReactNode } from 'react'

export function AuthProvider({ children, appearance }: { children: ReactNode; appearance?: Record<string, unknown> }) {
  return (
    <BaseClerkProvider afterSignOutUrl='/' appearance={appearance}>
      {children}
    </BaseClerkProvider>
  )
}
