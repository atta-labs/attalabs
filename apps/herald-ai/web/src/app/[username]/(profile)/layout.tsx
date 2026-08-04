import type { ReactNode } from 'react'
import { auth } from '@clerk/nextjs/server'
import { getProductBranding } from '@atta/cms'
import { getUserByUsername } from '@/db/queries'
import { EnvoyShell } from '../envoy-shell'
import { EnvoyLibraryShell } from '@/components/envoy/EnvoyLibraryShell'
import type { UILibrary } from '@atta/ui/lib/library-loader'

export default async function ProfileLayout({
  children,
  params
}: {
  children: ReactNode
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const [branding, user, { userId }] = await Promise.all([
    getProductBranding('herald').catch(() => null),
    getUserByUsername(username),
    auth()
  ])

  const isOwner = userId !== null && user != null && userId === user.clerkId

  const logoUrl = branding?.logoSolidDark?.url ?? branding?.logoSolidLight?.url ?? null
  const profileIdentity = {
    name: user?.name ?? null,
    title: user?.title ?? null,
    avatarUrl: user?.avatarUrl ?? null,
    cvUrl: user?.cvUrl ?? null
  }
  // user.library drives ONLY the public profile. Owner /ui + /settings
  // live under (owner)/ and are fed the build-time library instead.
  const userLibrary = (user?.library ?? 'basic') as UILibrary

  return (
    <EnvoyLibraryShell initialLibrary={userLibrary}>
      <EnvoyShell logoUrl={logoUrl} profileIdentity={profileIdentity} isOwner={isOwner} username={username}>
        {children}
      </EnvoyShell>
    </EnvoyLibraryShell>
  )
}
