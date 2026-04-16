import type { ReactNode } from 'react'
import { auth } from '@atta/auth/hooks'
import { UserTopBar } from '@/components/UserTopBar'
import { StickyHeaderTopBar } from '@/components/StickyHeaderTopBar'
import { UserPreferencesProvider } from '@/lib/user-preferences-context'
import { getOrCreateUser } from '@/db/queries'
import { getUserSettings } from '@/db/settings-queries'
import type { FaceStyle } from '@atta/ui/canvas'
import { Logo } from '@atta/ui/shared'
import { fetchVadaBranding } from '@/lib/branding'
import Link from 'next/link'

export default async function DeliberationLayout({ children }: { children: ReactNode }) {
  const { userId: clerkId } = await auth()
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
  let faceStyle: FaceStyle = 'emblematic'
  if (clerkId) {
    const user = await getOrCreateUser(clerkId, '')
    const settings = await getUserSettings(user.id)
    faceStyle = settings.faceStyle as FaceStyle
  }

  return (
    <UserPreferencesProvider faceStyle={faceStyle}>
      <StickyHeaderTopBar isBlurred={true} className='z-40'>
        <UserTopBar logo={logo} />
      </StickyHeaderTopBar>
      <main className='min-h-0 flex-1'>{children}</main>
    </UserPreferencesProvider>
  )
}
