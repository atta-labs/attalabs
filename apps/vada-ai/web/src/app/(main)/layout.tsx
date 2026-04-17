import type { ReactNode } from 'react'
import { NextLink } from '@atta/ui/lib/next-link'
import { Logo } from '@atta/ui/shared'
import { ToastProvider } from '@atta/ui'
import { auth } from '@atta/auth/hooks'
import { UserTopBar } from '@/components/UserTopBar'
import { StickyHeaderTopBar } from '@/components/StickyHeaderTopBar'
import { fetchVadaBranding } from '@/lib/branding'
import { UserPreferencesProvider } from '@/lib/user-preferences-context'
import { getOrCreateUser } from '@/db/queries'
import { getUserSettings } from '@/db/settings-queries'
import type { FaceStyle } from '@atta/ui/canvas'

export default async function MainLayout({ children }: { children: ReactNode }) {
  const branding = await fetchVadaBranding()
  const lightUrl = branding?.logoLockupSolidLight?.url ?? branding?.logoSolidLight?.url
  const darkUrl = branding?.logoLockupSolidDark?.url ?? branding?.logoSolidDark?.url
  const logo =
    lightUrl || darkUrl ? (
      <NextLink variant='unstyled' href='/'>
        <Logo light={lightUrl} dark={darkUrl} alt={branding?.productName ?? 'Vada AI'} size='h-10' />
      </NextLink>
    ) : null

  const { userId: clerkId } = await auth()
  let faceStyle: FaceStyle = 'emblematic'
  if (clerkId) {
    const user = await getOrCreateUser(clerkId, '')
    const settings = await getUserSettings(user.id)
    faceStyle = settings.faceStyle as FaceStyle
  }

  return (
    <UserPreferencesProvider faceStyle={faceStyle}>
      <ToastProvider defaultPosition='bottom-right'>
        <div className='h-dvh overflow-y-auto'>
          <StickyHeaderTopBar isBlurred={true} className='z-40 border-b border-border/40'>
            <UserTopBar logo={logo} />
          </StickyHeaderTopBar>
          <main>{children}</main>
        </div>
      </ToastProvider>
    </UserPreferencesProvider>
  )
}
