import type { ReactNode } from 'react'
import { ToastProvider } from '@atta/ui'
import { auth } from '@atta/auth/hooks'
import { NextLink } from '@atta/ui/lib/next-link'
import { Logo } from '@atta/ui/shared'
import { Footer } from '@atta/ui/footer'
import { UserTopBar } from '@/components/UserTopBar'
import { StickyHeaderTopBar } from '@/components/StickyHeaderTopBar'
import { UserPreferencesProvider } from '@/lib/user-preferences-context'
import { getOrCreateUser } from '@/db/queries'
import { getUserSettings } from '@/db/settings-queries'
import { fetchVadaBranding } from '@/lib/branding'
import type { FaceStyle } from '@/components/agents'

export default async function MainLayout({ children }: { children: ReactNode }) {
  const { userId: clerkId } = await auth()
  let faceStyle: FaceStyle = 'emblematic'
  if (clerkId) {
    await getOrCreateUser(clerkId, '')
    const settings = await getUserSettings(clerkId)
    faceStyle = settings.faceStyle as FaceStyle
  }

  const branding = await fetchVadaBranding()
  const lightUrl = branding?.logoSolidLight?.url ?? branding?.logoSolidDark?.url
  const darkUrl = branding?.logoSolidDark?.url ?? branding?.logoSolidLight?.url
  const logo =
    lightUrl || darkUrl ? (
      <NextLink variant='unstyled' href='/'>
        <Logo
          light={lightUrl}
          dark={darkUrl}
          alt={branding?.productName ?? 'Vada AI'}
          size='h-10'
          text={['Deliberation', 'Teams']}
        />
      </NextLink>
    ) : null

  return (
    <UserPreferencesProvider faceStyle={faceStyle}>
      <ToastProvider defaultPosition='bottom-right'>
        <div className='flex flex-col min-h-dvh'>
          <StickyHeaderTopBar isBlurred={true} className='z-40 border-border/40'>
            <UserTopBar logo={logo} />
          </StickyHeaderTopBar>
          <div className='flex-1 flex flex-col'>
            <div className='flex-1'>{children}</div>
            <Footer
              product='vada'
              tagline='Multi-agent deliberation'
              links={[
                { label: 'Trust', href: '/trust' },
                { label: 'MCP', href: '/mcp' },
                { label: 'Teams', href: '/teams' }
              ]}
              showProductNav={true}
            />
          </div>
        </div>
      </ToastProvider>
    </UserPreferencesProvider>
  )
}
