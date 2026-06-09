'use client'

import { Suspense, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { Download, ExternalLink } from 'lucide-react'
import { SignInButton, useUser } from '@atta/auth'
import { HeraldAccountMenu } from '@/components/HeraldAccountMenu'
import { Button as BasicButton } from '@atta/ui/components/button'
import { useComponents } from '@atta/ui/lib/library-provider'
import { Logo } from '@atta/ui/shared'
import { ColorSchemeToggle } from '@atta/ui/lib/color-scheme-toggle'
import { NextLink } from '@atta/ui/lib/next-link'
import { cn } from '@atta/ui/lib/utils'
import { AvatarFrame } from '@/components/avatar-frame'
import { HeroCollapseProvider, useHeroCollapse } from '@/components/envoy/hero-collapse-context'

async function downloadCv(url: string, filename: string) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(objectUrl)
  } catch {
    window.open(url, '_blank')
  }
}

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
  const comps = useComponents()
  const Button = (comps.Button as typeof BasicButton | undefined) ?? BasicButton

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

  const cvRawFile = profileIdentity.cvUrl ? (profileIdentity.cvUrl.split('/').pop() ?? '') : null
  const cvExt = cvRawFile ? (cvRawFile.split('.').pop() ?? 'pdf') : 'pdf'
  const cvFilename = profileIdentity.cvUrl ? `${(profileIdentity.name ?? 'CV').replace(/\s+/g, '_')}_CV.${cvExt}` : null

  const logoNodeMobile = (
    <NextLink variant='unstyled' href='/' className='flex shrink-0 items-center gap-2'>
      {logoUrl ? (
        <Logo dark={logoUrl} alt='Herald' size='h-10' />
      ) : (
        <span className='font-mono text-sm font-bold tracking-tight'>Herald</span>
      )}
    </NextLink>
  )

  const logoNodeDesktop = (
    <NextLink variant='unstyled' href='/' className='flex shrink-0 items-center gap-2'>
      {logoUrl ? (
        <Logo dark={logoUrl} alt='Herald' size='h-10' text={['Forensic hiring', 'audits']} />
      ) : (
        <span className='font-mono text-sm font-bold tracking-tight'>Herald</span>
      )}
    </NextLink>
  )

  return (
    <>
      <nav className='absolute inset-x-0 top-0 z-50 bg-background/40 backdrop-blur-md'>
        {/* ── Mobile (< md): Logo LEFT | Theme+Auth RIGHT ── */}
        <div className='flex h-14 items-center justify-between px-4 md:hidden'>
          <div className='flex items-center'>{logoNodeMobile}</div>
          <div className='flex items-center gap-2'>
            <ColorSchemeToggle />
            {user ? (
              <HeraldAccountMenu />
            ) : (
              <SignInButton mode='modal'>
                <Button variant='outline' size='sm' className='text-xs'>
                  Sign in
                </Button>
              </SignInButton>
            )}
          </div>
        </div>

        {/* ── Desktop (≥ md): Logo absolute-left | centered body column | Theme+Auth absolute-right ── */}
        <div className='relative hidden h-14 md:block'>
          {/* Logo — pinned to viewport left */}
          <div className='absolute inset-y-0 left-0 flex items-center pl-6'>{logoNodeDesktop}</div>

          {/* Body column — aligns docked identity with hero avatar */}
          <div className='mx-auto flex h-full max-w-[680px] items-center justify-between px-6'>
            {/* Docked identity (left edge of body column) */}
            <div className={cn('flex min-w-0 items-center gap-2.5', dockedTransition)} aria-hidden={!isCollapsed}>
              {profileIdentity.avatarUrl && (
                <AvatarFrame src={profileIdentity.avatarUrl} alt={profileIdentity.name ?? ''} size={36} />
              )}
              {(profileIdentity.name || profileIdentity.title) && (
                <div className='flex min-w-0 flex-col leading-tight'>
                  {profileIdentity.name && (
                    <span className='truncate text-xs font-semibold text-foreground sm:text-sm'>
                      {profileIdentity.name}
                    </span>
                  )}
                  {profileIdentity.title && (
                    <span className='truncate text-[11px] text-muted-foreground sm:text-xs'>
                      {profileIdentity.title}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Docked CV buttons (right edge of body column) */}
            {profileIdentity.cvUrl && cvFilename && (
              <div className={cn('flex shrink-0 items-center gap-1', dockedTransition)} aria-hidden={!isCollapsed}>
                <Button
                  variant='outline'
                  size='icon'
                  aria-label='Download CV'
                  title='Download CV'
                  onClick={() => downloadCv(profileIdentity.cvUrl!, cvFilename!)}
                >
                  <Download className='h-4 w-4' />
                </Button>
                <Button
                  variant='outline'
                  size='icon'
                  aria-label='Open CV'
                  title='Open CV'
                  onClick={() => window.open(profileIdentity.cvUrl!, '_blank')}
                >
                  <ExternalLink className='h-4 w-4' />
                </Button>
              </div>
            )}
          </div>

          {/* Theme + Auth — pinned to viewport right */}
          <div className='absolute inset-y-0 right-0 flex items-center gap-2 pr-6'>
            {isOwner && (
              <NextLink variant='nav' href='/bulk-audit' className='text-xs'>
                Bulk Audit
              </NextLink>
            )}
            <ColorSchemeToggle />
            {user ? (
              <HeraldAccountMenu />
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

      {/* Mobile sticky identity bar — below topbar, slides in when hero scrolls away */}
      <div
        className={cn('absolute inset-x-0 top-14 z-40 bg-background/40 backdrop-blur-md md:hidden', dockedTransition)}
        aria-hidden={!isCollapsed}
      >
        <div className='flex h-12 items-center gap-2.5 px-4'>
          {profileIdentity.avatarUrl && (
            <AvatarFrame src={profileIdentity.avatarUrl} alt={profileIdentity.name ?? ''} size={32} pennant={false} />
          )}
          {(profileIdentity.name || profileIdentity.title) && (
            <div className='flex min-w-0 flex-col leading-tight'>
              {profileIdentity.name && (
                <span className='truncate text-xs font-semibold text-foreground'>{profileIdentity.name}</span>
              )}
              {profileIdentity.title && (
                <span className='truncate text-[11px] text-muted-foreground'>{profileIdentity.title}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export interface EnvoyShellProps {
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
