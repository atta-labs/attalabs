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
          name: user.name,
          title: user.title,
          location: user.location ?? '',
          availability: user.availability ?? '',
          summary: user.summary,
          stack: (() => {
            try {
              return (JSON.parse(user.stack) as string[]).join(', ')
            } catch {
              return ''
            }
          })(),
          github: user.githubHandle ?? '',
          bio: user.bio ?? '',
          avatarUrl: user.avatarUrl ?? null,
          cvUrl: user.cvUrl ?? null
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
