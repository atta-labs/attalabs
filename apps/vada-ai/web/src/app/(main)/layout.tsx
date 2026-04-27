import type { ReactNode } from 'react'
import { ToastProvider } from '@atta/ui'
import { auth } from '@atta/auth/hooks'
import { UserPreferencesProvider } from '@/lib/user-preferences-context'
import { getOrCreateUser } from '@/db/queries'
import { getUserSettings } from '@/db/settings-queries'
import type { FaceStyle } from '@/components/agents'

export default async function MainLayout({ children }: { children: ReactNode }) {
  const { userId: clerkId } = await auth()
  let faceStyle: FaceStyle = 'emblematic'
  if (clerkId) {
    await getOrCreateUser(clerkId, '')
    const settings = await getUserSettings(clerkId)
    faceStyle = settings.faceStyle as FaceStyle
  }

  return (
    <UserPreferencesProvider faceStyle={faceStyle}>
      <ToastProvider defaultPosition='bottom-right'>
        <div className='h-dvh overflow-y-auto'>{children}</div>
      </ToastProvider>
    </UserPreferencesProvider>
  )
}
