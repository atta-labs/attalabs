import { auth } from '@clerk/nextjs/server'
import { cmsClient, getThemes } from '@herald/cms'
import { redirect } from 'next/navigation'
import { ThemeBrowser } from '@/components/portal/ThemeBrowser'
import { getUserByClerkId } from '@/db/queries'

export default async function AdminUIPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await getUserByClerkId(userId)
  if (!user?.onboardingComplete) redirect('/admin')

  const themes = await getThemes(cmsClient)

  return (
    <div className='h-full'>
      <ThemeBrowser
        themes={themes}
        currentThemeId={user.themeId}
        currentColorScheme={(user.colorScheme as 'dark' | 'light') ?? 'dark'}
        currentLibrary={user.library ?? 'basic'}
        username={user.username}
      />
    </div>
  )
}
