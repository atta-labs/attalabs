import type { ReactNode } from 'react'
import Link from 'next/link'
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
  const logo =
    branding?.logoSolidLight?.url || branding?.logoSolidDark?.url ? (
      <Link href='/'>
        <Logo
          light={branding.logoSolidLight?.url}
          dark={branding.logoSolidDark?.url}
          alt={branding.productName ?? 'Vada AI'}
          size='h-9'
        />
      </Link>
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
        <div className='flex h-dvh flex-col'>
          <StickyHeaderTopBar isBlurred={true} className='z-40 shrink-0 border-b border-border/40'>
            <UserTopBar logo={logo} />
          </StickyHeaderTopBar>
          <div className='min-h-0 flex-1 overflow-y-auto'>{children}</div>
        </div>
      </ToastProvider>
    </UserPreferencesProvider>
  )
}
