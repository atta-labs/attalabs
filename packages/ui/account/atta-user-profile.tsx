'use client'

import { UserProfile, clerkDarkTheme } from '@atta/auth'
import { useEffect, useState } from 'react'

interface AttaUserProfileProps {
  logoLight?: string
  logoDark?: string
}

const PROFILE_VARIABLES = {
  colorPrimary: 'var(--primary)',
  colorPrimaryForeground: 'var(--primary-foreground)',
  colorNeutral: 'var(--foreground)',
  colorBackground: 'var(--background)',
  colorForeground: 'var(--foreground)',
  colorDanger: 'var(--destructive)',
  colorMuted: 'var(--muted)',
  colorMutedForeground: 'var(--muted-foreground)',
  colorInput: 'var(--card)',
  colorInputForeground: 'var(--foreground)'
}

const PROFILE_ELEMENTS_SHARED = {
  cardBox: { overflow: 'visible' },
  navbarButton: { color: 'var(--foreground)' },
  navbarButtonIcon: { color: 'var(--muted-foreground)' },
  headerTitle: { color: 'var(--foreground)', fontFamily: 'var(--font-serif)' },
  headerSubtitle: { color: 'var(--muted-foreground)' },
  userPreviewMainIdentifier: { color: 'var(--foreground)' },
  userPreviewSecondaryIdentifier: { color: 'var(--muted-foreground)' },
  pageScrollBox: { backgroundColor: 'var(--background)' },
  scrollBox: { backgroundColor: 'var(--background)' },
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

  return (
    <UserProfile
      routing='hash'
      appearance={{
        baseTheme: scheme === 'dark' ? clerkDarkTheme : undefined,
        variables: PROFILE_VARIABLES,
        elements: {
          ...PROFILE_ELEMENTS_SHARED,
          card: { backgroundColor: 'var(--card)', border: '1px solid var(--border)' },
          navbar: {
            backgroundColor: 'var(--card)',
            borderRight: '1px solid var(--border)',
            color: 'var(--foreground)'
          },
          pageScrollBox: { backgroundColor: 'var(--card)' },
          scrollBox: { backgroundColor: 'var(--card)' }
        },
        ...(logoImageUrl ? { layout: { logoImageUrl } } : {})
      }}
    />
  )
}
