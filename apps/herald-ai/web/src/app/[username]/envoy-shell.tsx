'use client'

import { Suspense, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { Download, ExternalLink } from 'lucide-react'
import { useUser } from '@atta/auth'
import { HeraldAccountMenu } from '@/components/HeraldAccountMenu'
import { Button as BasicButton } from '@atta/ui/components/button'
import { useComponents } from '@atta/ui/lib/library-provider'
import { TopBar, type TopBarLink } from '@atta/ui/topbar'
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

const OWNER_LINKS: TopBarLink[] = [
  { label: 'Bulk Audit', href: '/bulk-audit' },
  { label: 'UI', href: '/ui' },
  { label: 'Settings', href: '/settings' }
]

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

  return (
    <>
      {/* Row 1 — standard app topbar (shared TopBar), wrapped to overlay the hero with a translucent backdrop */}
      <div className='absolute inset-x-0 top-0 z-50 bg-background/40 backdrop-blur-md'>
        <TopBar
          logoText='Herald'
          logoUrl={logoUrl}
          logoTagline={['Forensic hiring', 'audits']}
          isSignedIn={!!user}
          signedInLinks={isOwner ? OWNER_LINKS : []}
          accountMenu={<HeraldAccountMenu />}
        />
      </div>

      {/* Row 2 — sticky identity bar (all breakpoints), slides in when hero scrolls away */}
      <div
        className={cn('absolute inset-x-0 top-14 z-40 bg-background/40 backdrop-blur-md', dockedTransition)}
        aria-hidden={!isCollapsed}
      >
        <div className='mx-auto flex h-12 max-w-[680px] items-center gap-2.5 px-6'>
          {profileIdentity.avatarUrl && (
            <AvatarFrame src={profileIdentity.avatarUrl} alt={profileIdentity.name ?? ''} size={36} />
          )}
          {(profileIdentity.name || profileIdentity.title) && (
            <div className='flex min-w-0 flex-1 flex-col leading-tight'>
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
          {profileIdentity.cvUrl && cvFilename && (
            <div className='ml-auto flex shrink-0 items-center gap-1'>
              <Button
                variant='outline'
                size='icon'
                aria-label='Download CV'
                title='Download CV'
                className='h-8 w-8'
                onClick={() => downloadCv(profileIdentity.cvUrl!, cvFilename!)}
              >
                <Download className='h-4 w-4' />
              </Button>
              <Button
                variant='outline'
                size='icon'
                aria-label='Open CV'
                title='Open CV'
                className='h-8 w-8'
                onClick={() => window.open(profileIdentity.cvUrl!, '_blank')}
              >
                <ExternalLink className='h-4 w-4' />
              </Button>
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
