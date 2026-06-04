'use client'

import { Suspense, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { Download, ExternalLink } from 'lucide-react'
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
  cvUrl: string | null
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
    <nav className='absolute inset-x-0 top-0 z-50 bg-background/40 backdrop-blur-md'>
      {/* Logo — pinned at viewport left corner */}
      <div className='absolute inset-y-0 left-0 flex items-center pl-6'>
        <NextLink variant='unstyled' href='/' className='flex items-center gap-2'>
          {logoUrl ? (
            <Logo dark={logoUrl} alt='Herald' size='h-10' text={['Forensic hiring', 'audits']} />
          ) : (
            <span className='font-mono text-sm font-bold tracking-tight'>Herald</span>
          )}
        </NextLink>
      </div>

      {/* Content column — aligned to the page body column (same max-w + px) */}
      <div className='mx-auto flex h-14 max-w-[680px] items-center justify-between px-6'>
        {/* Docked identity — left edge of the content column */}
        <div
          className={cn(
            'flex items-center gap-2.5 transition-all duration-300 ease-out motion-reduce:transition-none',
            isCollapsed ? 'translate-y-0 opacity-100' : 'pointer-events-none select-none translate-y-1.5 opacity-0'
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

        {/* CV buttons — right edge of the content column */}
        {profileIdentity.cvUrl && (
          <div
            className={cn(
              'flex shrink-0 items-center gap-1 transition-all duration-300 ease-out motion-reduce:transition-none',
              isCollapsed ? 'translate-y-0 opacity-100' : 'pointer-events-none select-none translate-y-1.5 opacity-0'
            )}
            aria-hidden={!isCollapsed}
          >
            <a
              href={profileIdentity.cvUrl}
              download
              aria-label='Download CV'
              title='Download CV'
              className='flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary'
            >
              <Download className='h-3.5 w-3.5' />
            </a>
            <a
              href={profileIdentity.cvUrl}
              target='_blank'
              rel='noreferrer'
              aria-label='Open CV'
              title='Open CV'
              className='flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary'
            >
              <ExternalLink className='h-3.5 w-3.5' />
            </a>
          </div>
        )}
      </div>

      {/* Theme toggle + Clerk — pinned at viewport right corner */}
      <div className='absolute inset-y-0 right-0 flex items-center gap-3 pr-6'>
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
      <div className='relative h-dvh overflow-hidden'>
        <Suspense>
          <EnvoyNavContent logoUrl={logoUrl} profileIdentity={profileIdentity} />
        </Suspense>
        <main className='absolute inset-0 overflow-hidden'>{children}</main>
      </div>
    </HeroCollapseProvider>
  )
}
