'use client'

import { UserProfile } from '@atta/auth'
import { useEffect, useState } from 'react'

interface AttaUserProfileProps {
  logoLight?: string
  logoDark?: string
  routing?: 'hash' | 'virtual'
}

const PROFILE_ELEMENTS = {
  navbar: {
    backgroundColor: 'var(--card)',
    borderRight: '1px solid var(--border)'
  },
  navbarButton: {
    color: 'var(--foreground)'
  },
  navbarButtonIcon: {
    color: 'var(--muted-foreground)'
  },
  pageScrollBox: {
    backgroundColor: 'var(--background)'
  },
  scrollBox: {
    backgroundColor: 'var(--background)'
  },
  profileSection: {
    borderTop: '1px solid var(--border)'
  },
  profileSectionTitle: {
    color: 'var(--foreground)'
  },
  profileSectionPrimaryButton: {
    backgroundColor: 'var(--primary)',
    color: 'var(--primary-foreground)'
  }
}

export function AttaUserProfile({ logoLight, logoDark, routing = 'hash' }: AttaUserProfileProps) {
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
      routing={routing}
      appearance={{
        elements: PROFILE_ELEMENTS,
        ...(logoImageUrl ? { layout: { logoImageUrl } } : {})
      }}
    />
  )
}
