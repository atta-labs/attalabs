import { cmsClient, getThemes } from '@atta/cms'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { AdminEditorPage } from '@/components/portal/AdminEditorPage'
import { getUserByClerkId } from '@/db/queries'

export default async function AdminUIPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await getUserByClerkId(userId)
  if (!user?.onboardingComplete) redirect('/admin')

  const themes = await getThemes(cmsClient)

  return (
    <div className='h-full'>
      <AdminEditorPage
        username={user.username}
        initialProfile={{
          avatarUrl: user.avatarUrl ?? null
        }}
        initialTheme={{
          themeId: user.themeId ?? null,
          colorScheme: (user.colorScheme as 'dark' | 'light') ?? 'dark',
          library: user.library ?? 'basic',
          fontSans: user.fontSans ?? null
        }}
        themes={themes}
      />
    </div>
  )
}
