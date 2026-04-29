'use client'

import { ClerkProvider as BaseClerkProvider } from '@clerk/nextjs'
import { useEffect, useState, type ReactNode } from 'react'
import { computeClerkAppearance } from './client-appearance'

export function AuthProvider({
  children,
  appearance: initialAppearance
}: {
  children: ReactNode
  appearance?: Record<string, unknown>
}) {
  const [appearance, setAppearance] = useState(initialAppearance)

  useEffect(() => {
    setAppearance(computeClerkAppearance())
    const observer = new MutationObserver(() => setAppearance(computeClerkAppearance()))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    })
    return () => observer.disconnect()
  }, [])

  return (
    <BaseClerkProvider afterSignOutUrl='/' appearance={appearance}>
      {children}
    </BaseClerkProvider>
  )
}
