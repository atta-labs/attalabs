'use client'

import { Suspense, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Download, ExternalLink, Palette } from 'lucide-react'
import { useUser } from '@atta/auth'
import { HeraldAccountMenu } from '@/components/HeraldAccountMenu'
import { Button as BasicButton } from '@atta/ui/components/button'
import { useComponents } from '@atta/ui/lib/library-provider'
import { TopBar } from '@atta/ui/topbar'
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
  isOwner,
  username
}: {
  logoUrl: string | null
  profileIdentity: ProfileIdentity
  isOwner: boolean
  username: string
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
      {/* Row 1 — standard app topbar (shared TopBar). In-flow at top of the page — public profile only.
          Scrolls away with the page; Row 2 (fixed) takes over once the hero is collapsed.
          D-060: Bulk Audit / UI / Settings nav links are gone from the profile topbar; the owner-only
          Palette icon button below opens the appearance editor at /{username}/ui. The main app gear
          (→ /{me}/settings) lives on HeraldTopBar — the profile topbar deliberately does not duplicate it. */}
      <div className='bg-background'>
        <TopBar
          logoText='Herald'
          logoUrl={logoUrl}
          logoTagline={['Forensic hiring', 'audits']}
          isSignedIn={!!user}
          signedInLinks={[]}
          extraActions={
            isOwner ? (
              <Button
                asChild
                variant='outline'
                size='icon'
                className='h-8 w-8'
                aria-label='Edit appearance'
                title='Edit appearance'
              >
                <Link href={`/${username}/ui`}>
                  <Palette className='h-4 w-4' />
                </Link>
              </Button>
            ) : undefined
          }
          accountMenu={<HeraldAccountMenu />}
        />
      </div>

      {/* Row 2 — docked identity bar (fixed to viewport), slides in when hero scrolls away */}
      <div
        className={cn('fixed inset-x-0 top-0 z-50 bg-background/80 backdrop-blur-md', dockedTransition)}
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
  username: string
}

export function EnvoyShell({ children, logoUrl, profileIdentity, isOwner = false, username }: EnvoyShellProps) {
  return (
    <HeroCollapseProvider>
      <div className='relative min-h-dvh'>
        <Suspense>
          <EnvoyNavContent logoUrl={logoUrl} profileIdentity={profileIdentity} isOwner={isOwner} username={username} />
        </Suspense>
        <main className='relative'>{children}</main>
      </div>
    </HeroCollapseProvider>
  )
}
