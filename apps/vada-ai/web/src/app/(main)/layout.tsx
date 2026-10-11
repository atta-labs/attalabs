import type { ReactNode } from 'react'
import { ToastProvider } from '@atta/ui/components'
import { Button } from '@atta/ui/components'
import { auth } from '@atta/auth/hooks'
import { NextLink } from '@atta/ui/lib/next-link'
import { Logo } from '@atta/ui/shared'
import { TopBar } from '@atta/ui/topbar'
import { Settings } from 'lucide-react'
import { StickyHeaderTopBar } from '@/components/StickyHeaderTopBar'
import { RouteAwareFooter } from '@/components/RouteAwareFooter'
import { UserPreferencesProvider } from '@/lib/user-preferences-context'
import { getOrCreateUser } from '@/db/queries'
import { getUserSettings } from '@/db/settings-queries'
import { fetchVadaBranding } from '@/lib/branding'
import { PUBLIC_ROUTES, AUTH_ROUTES } from '@/lib/route-config'
import type { FaceStyle } from '@/components/agents'

// No bottom border anywhere. On the home hero's opening state (`data-bare="true"` on the
// header, see StickyHeaderTopBar) the frame has no surface at all — background, shadow and
// backdrop blur drop, so the fabric paints straight through (Vinaya's TOPBAR_CHROME_CLASS).
const TOPBAR_CHROME_CLASS =
  'border-transparent [[data-bare=true]_&]:bg-transparent [[data-bare=true]_&]:shadow-none [[data-bare=true]_&]:backdrop-blur-none'

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
      <NextLink variant='unstyled' href='/' data-topbar-logo>
        <Logo
          light={lightUrl}
          dark={darkUrl}
          alt={branding?.productName ?? 'Vada AI'}
          size='h-10'
          text={['Deliberation', 'Teams']}
        />
      </NextLink>
    ) : null

  const extraActions = (
    <Button variant='ghost' size='icon' asChild aria-label='Settings' title='Settings'>
      <NextLink variant='unstyled' href='/settings'>
        <Settings className='h-4 w-4' />
      </NextLink>
    </Button>
  )

  return (
    <UserPreferencesProvider faceStyle={faceStyle}>
      <ToastProvider defaultPosition='bottom-right'>
        <div className='flex flex-col min-h-dvh'>
          <StickyHeaderTopBar isBlurred={true} className='z-40 border-border/40'>
            <TopBar
              logo={logo}
              links={PUBLIC_ROUTES}
              signedInLinks={AUTH_ROUTES}
              extraActions={extraActions}
              chromeClassName={TOPBAR_CHROME_CLASS}
            />
          </StickyHeaderTopBar>
          <div className='flex-1 flex flex-col'>
            <div className='flex-1'>{children}</div>
            <RouteAwareFooter />
          </div>
        </div>
      </ToastProvider>
    </UserPreferencesProvider>
  )
}
