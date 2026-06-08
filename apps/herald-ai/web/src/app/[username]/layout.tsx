import type { ReactNode } from 'react'
import { auth } from '@clerk/nextjs/server'
import { cmsClient, getHeraldBranding } from '@atta/cms'
import { getUserByUsername } from '@/db/queries'
import { EnvoyShell } from './envoy-shell'
import { EnvoyLibraryShell } from '@/components/envoy/EnvoyLibraryShell'
import type { UILibrary } from '@atta/ui/lib/library-loader'

export default async function EnvoyLayout({
  children,
  params
}: {
  children: ReactNode
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const [branding, user, { userId }] = await Promise.all([
    getHeraldBranding(cmsClient).catch(() => null),
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
  const userLibrary = (user?.library ?? 'basic') as UILibrary

  return (
    <EnvoyLibraryShell initialLibrary={userLibrary}>
      <EnvoyShell logoUrl={logoUrl} profileIdentity={profileIdentity} isOwner={isOwner}>
        {children}
      </EnvoyShell>
    </EnvoyLibraryShell>
  )
}
