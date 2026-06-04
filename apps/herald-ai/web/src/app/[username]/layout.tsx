import type { ReactNode } from 'react'
import { cmsClient, getHeraldBranding } from '@atta/cms'
import { getUserByUsername } from '@/db/queries'
import { EnvoyShell } from './envoy-shell'

export default async function EnvoyLayout({
  children,
  params
}: {
  children: ReactNode
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const [branding, user] = await Promise.all([
    getHeraldBranding(cmsClient).catch(() => null),
    getUserByUsername(username)
  ])

  const logoUrl = branding?.logoSolidDark?.url ?? branding?.logoSolidLight?.url ?? null
  const profileIdentity = {
    name: user?.name ?? null,
    title: user?.title ?? null,
    avatarUrl: user?.avatarUrl ?? null
  }

  return (
    <EnvoyShell logoUrl={logoUrl} profileIdentity={profileIdentity}>
      {children}
    </EnvoyShell>
  )
}
