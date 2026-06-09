'use client'

import { UserProfile, clerkDarkTheme } from '@atta/auth'
import { useEffect, useState } from 'react'

interface AttaUserProfileProps {
  logoLight?: string
  logoDark?: string
}

const PROFILE_VARIABLES_BASE = {
  colorPrimary: 'var(--primary)',
  colorPrimaryForeground: 'var(--primary-foreground)',
  colorNeutral: 'var(--foreground)',
  colorForeground: 'var(--foreground)',
  colorDanger: 'var(--destructive)',
  colorMuted: 'var(--muted)',
  colorMutedForeground: 'var(--muted-foreground)',
  colorInputForeground: 'var(--foreground)'
}

const darkSurface = 'var(--card)'
const lightSurface = 'var(--card)'

const PROFILE_ELEMENTS_SHARED = {
  rootBox: { width: '100%', maxWidth: '100%' },
  cardBox: { width: '100%', maxWidth: '100%', overflow: 'visible' },
  navbarButton: { color: 'var(--foreground)' },
  navbarButtonIcon: { color: 'var(--muted-foreground)' },
  headerTitle: { color: 'var(--foreground)', fontFamily: 'var(--font-serif)' },
  headerSubtitle: { color: 'var(--muted-foreground)' },
  userPreviewMainIdentifier: { color: 'var(--foreground)' },
  userPreviewSecondaryIdentifier: { color: 'var(--muted-foreground)' },
  profileSection: { borderTop: '1px solid var(--border)' },
  profileSectionTitle: { color: 'var(--foreground)' },
  profileSectionPrimaryButton: { backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' },
  formButtonPrimary: { backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' },
  badge: { backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' },
  dividerLine: { backgroundColor: 'var(--border)' },
  footer: { display: 'none' }
}

export function AttaUserProfile({ logoLight, logoDark }: AttaUserProfileProps) {
  const [scheme, setScheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    const read = () => {
      const attr = document.documentElement.getAttribute('data-theme')
      setScheme(attr === 'light' ? 'light' : 'dark')
    }
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  const logoImageUrl = scheme === 'dark' ? logoDark : logoLight

  const surface = scheme === 'dark' ? darkSurface : lightSurface

  return (
    <UserProfile
      routing='hash'
      appearance={{
        baseTheme: scheme === 'dark' ? clerkDarkTheme : undefined,
        variables: {
          ...PROFILE_VARIABLES_BASE,
          colorBackground: surface,
          colorInput: surface
        },
        elements: {
          ...PROFILE_ELEMENTS_SHARED,
          card: { backgroundColor: surface, border: '1px solid var(--border)', width: '100%', maxWidth: '100%' },
          navbar: {
            backgroundColor: surface,
            borderRight: '1px solid var(--border)',
            color: 'var(--foreground)'
          },
          pageScrollBox: { backgroundColor: surface },
          scrollBox: { backgroundColor: surface }
        },
        ...(logoImageUrl ? { layout: { logoImageUrl } } : {})
      }}
    />
  )
}
