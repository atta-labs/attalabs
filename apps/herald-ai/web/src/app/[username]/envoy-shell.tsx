'use client'

import { Suspense, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { Download, ExternalLink } from 'lucide-react'
import { SignInButton, UserButton, useUser } from '@atta/auth'
import { Button } from '@atta/ui/components'
import { Logo } from '@atta/ui/shared'
import { ColorSchemeToggle } from '@atta/ui/lib/color-scheme-toggle'
import { NextLink } from '@atta/ui/lib/next-link'
import { cn } from '@atta/ui/lib/utils'
import { AvatarFrame } from '@/components/avatar-frame'
import { HeroCollapseProvider, useHeroCollapse } from '@/components/envoy/hero-collapse-context'

export interface ProfileIdentity {
  name: string | null
  title: string | null
  avatarUrl: string | null
  cvUrl: string | null
}

function EnvoyNavContent({
  logoUrl,
  profileIdentity,
  isOwner
}: {
  logoUrl: string | null
  profileIdentity: ProfileIdentity
  isOwner: boolean
}) {
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

  const dockedTransition = cn(
    'transition-all duration-300 ease-out motion-reduce:transition-none',
    isCollapsed ? 'translate-y-0 opacity-100' : 'pointer-events-none select-none translate-y-1.5 opacity-0'
  )

  return (
    <nav className='absolute inset-x-0 top-0 z-50 bg-background/40 backdrop-blur-md'>
      <div className='flex h-14 items-center justify-between gap-3 px-4 sm:px-6'>
        {/* Left: logo + docked identity (identity fades in on collapse) */}
        <div className='flex min-w-0 items-center gap-3'>
          <NextLink variant='unstyled' href='/' className='flex shrink-0 items-center gap-2'>
            {logoUrl ? (
              <Logo dark={logoUrl} alt='Herald' size='h-10' text={['Forensic hiring', 'audits']} />
            ) : (
              <span className='font-mono text-sm font-bold tracking-tight'>Herald</span>
            )}
          </NextLink>

          <div className={cn('flex min-w-0 items-center gap-2.5', dockedTransition)} aria-hidden={!isCollapsed}>
            {profileIdentity.avatarUrl && (
              <AvatarFrame
                src={profileIdentity.avatarUrl}
                alt={profileIdentity.name ?? ''}
                size={36}
                variant='plain'
                pennant={false}
              />
            )}
            {(profileIdentity.name || profileIdentity.title) && (
              <div className='flex min-w-0 flex-col leading-tight'>
                {profileIdentity.name && (
                  <span className='truncate text-xs font-semibold text-foreground sm:text-sm'>
                    {profileIdentity.name}
                  </span>
                )}
                {profileIdentity.title && (
                  <span className='truncate text-[11px] text-muted-foreground sm:text-xs'>{profileIdentity.title}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: CV (desktop only) + theme + auth/dashboard */}
        <div className='flex shrink-0 items-center gap-2 sm:gap-3'>
          {profileIdentity.cvUrl && (
            <div
              className={cn('hidden shrink-0 items-center gap-1 sm:flex', dockedTransition)}
              aria-hidden={!isCollapsed}
            >
              <Button variant='outline' size='icon' className='h-7 w-7' asChild>
                <a href={profileIdentity.cvUrl} download aria-label='Download CV' title='Download CV'>
                  <Download className='h-3.5 w-3.5' />
                </a>
              </Button>
              <Button variant='outline' size='icon' className='h-7 w-7' asChild>
                <a href={profileIdentity.cvUrl} target='_blank' rel='noreferrer' aria-label='Open CV' title='Open CV'>
                  <ExternalLink className='h-3.5 w-3.5' />
                </a>
              </Button>
            </div>
          )}

          <ColorSchemeToggle />

          {isOwner ? (
            <div className='flex items-center gap-2 sm:gap-3'>
              <NextLink variant='unstyled' href='/dashboard'>
                <Button variant='outline' size='sm' className='text-xs'>
                  Dashboard
                </Button>
              </NextLink>
              <UserButton />
            </div>
          ) : user ? (
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
  isOwner?: boolean
}

export function EnvoyShell({ children, logoUrl, profileIdentity, isOwner = false }: EnvoyShellProps) {
  return (
    <HeroCollapseProvider>
      <div className='relative h-dvh overflow-hidden'>
        <Suspense>
          <EnvoyNavContent logoUrl={logoUrl} profileIdentity={profileIdentity} isOwner={isOwner} />
        </Suspense>
        <main className='absolute inset-0 overflow-hidden'>{children}</main>
      </div>
    </HeroCollapseProvider>
  )
}
