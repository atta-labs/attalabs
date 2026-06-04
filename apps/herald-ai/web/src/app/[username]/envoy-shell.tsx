'use client'

import { Suspense, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { SignInButton, UserButton, useUser } from '@atta/auth'
import { Button } from '@atta/ui/components/button'
import { Logo } from '@atta/ui/shared'
import { ColorSchemeToggle } from '@atta/ui/lib/color-scheme-toggle'
import { NextLink } from '@atta/ui/lib/next-link'
import { cn } from '@atta/ui/lib/utils'
import { HeroCollapseProvider, useHeroCollapse } from '@/components/envoy/hero-collapse-context'

export interface ProfileIdentity {
  name: string | null
  title: string | null
  avatarUrl: string | null
}

function EnvoyNavContent({ logoUrl, profileIdentity }: { logoUrl: string | null; profileIdentity: ProfileIdentity }) {
  const { isCollapsed } = useHeroCollapse()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const [inIframe, setInIframe] = useState(false)

  useEffect(() => {
    try {
      setInIframe(window.self !== window.top)
    } catch {
      setInIframe(true)
    }
  }, [])

  if (searchParams.get('preview') === 'true' || inIframe) return null

  return (
    <nav className='w-full border-b border-border'>
      <div className='flex h-14 w-full items-center px-6'>
        {/* Logo — pinned left */}
        <div className='flex flex-1 items-center'>
          <NextLink variant='unstyled' href='/' className='flex items-center gap-2'>
            {logoUrl ? (
              <Logo dark={logoUrl} alt='Herald' size='h-10' text={['Forensic hiring', 'audits']} />
            ) : (
              <span className='font-mono text-sm font-bold tracking-tight'>Herald</span>
            )}
          </NextLink>
        </div>

        {/* Docked identity — fades in when hero avatar+name scroll past the header */}
        <div
          className={cn(
            'flex items-center gap-2.5 transition-all duration-300 ease-out motion-reduce:transition-none',
            isCollapsed ? 'opacity-100 translate-y-0' : 'pointer-events-none select-none opacity-0 translate-y-1.5'
          )}
          aria-hidden={!isCollapsed}
        >
          {profileIdentity.avatarUrl && (
            // biome-ignore lint/performance/noImgElement: dynamic R2/blob URL — not optimisable via next/image
            <img
              src={profileIdentity.avatarUrl}
              alt={profileIdentity.name ?? ''}
              className='h-9 w-9 shrink-0 rounded-[7px] border border-border object-cover'
            />
          )}
          {(profileIdentity.name || profileIdentity.title) && (
            <div className='flex min-w-0 flex-col leading-tight'>
              {profileIdentity.name && (
                <span className='text-sm font-semibold text-foreground'>{profileIdentity.name}</span>
              )}
              {profileIdentity.title && (
                <span className='max-w-[220px] truncate text-xs text-muted-foreground'>{profileIdentity.title}</span>
              )}
            </div>
          )}
        </div>

        {/* Actions — pinned right */}
        <div className='flex flex-1 items-center justify-end gap-3'>
          <ColorSchemeToggle />
          {user ? (
            <UserButton />
          ) : (
            <SignInButton mode='modal'>
              <Button variant='outline' size='sm' className='text-xs'>
                Sign in
              </Button>
            </SignInButton>
          )}
        </div>
      </div>
    </nav>
  )
}

interface EnvoyShellProps {
  children: ReactNode
  logoUrl: string | null
  profileIdentity: ProfileIdentity
}

export function EnvoyShell({ children, logoUrl, profileIdentity }: EnvoyShellProps) {
  return (
    <HeroCollapseProvider>
      <div className='flex h-dvh flex-col overflow-hidden'>
        <Suspense>
          <EnvoyNavContent logoUrl={logoUrl} profileIdentity={profileIdentity} />
        </Suspense>
        <main className='min-h-0 flex-1 overflow-hidden'>{children}</main>
      </div>
    </HeroCollapseProvider>
  )
}
