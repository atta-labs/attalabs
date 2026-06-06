import { cmsClient, getLibraries, getThemes } from '@atta/cms'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { AdminEditorPage } from '@/components/portal/AdminEditorPage'
import { getUserByClerkId } from '@/db/queries'

export default async function CandidateUIPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await getUserByClerkId(userId)
  if (!user?.onboardingComplete) redirect('/candidate')

  const [themes, libraries] = await Promise.all([getThemes(cmsClient), getLibraries(cmsClient).catch(() => [])])

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
        libraries={libraries}
      />
    </div>
  )
}
