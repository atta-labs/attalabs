import { auth } from '@clerk/nextjs/server'
import { cmsClient, getThemeList } from '@herald/cms'
import { redirect } from 'next/navigation'
import { AIOnboarding } from '@/components/portal/AIOnboarding'
import { ProfileEditor } from '@/components/portal/ProfileEditor'
import { ThemePicker } from '@/components/portal/ThemePicker'
import { getUserByClerkId } from '@/db/queries'

export default async function AdminPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await getUserByClerkId(userId)

  // No user record yet → show onboarding
  if (!user?.onboardingComplete) {
    return <AIOnboarding />
  }

  // Onboarding complete → show dashboard
  const profile = {
    name: user.name,
    title: user.title,
    location: user.location ?? '',
    availability: user.availability ?? '',
    github: user.githubHandle ?? '',
    summary: user.summary,
    stack: JSON.parse(user.stack) as string[]
  }

  const themes = await getThemeList(cmsClient)

  return (
    <div className='mx-auto max-w-[900px] px-6 py-8'>
      <header className='mb-8'>
        <h1 className='font-display text-2xl tracking-tight'>Dashboard</h1>
        <p className='mt-1 font-mono text-xs text-muted'>
          Your Envoy is live at{' '}
          <a href={`/${user.username}`} target='_blank' className='text-foreground hover:underline' rel='noreferrer'>
            heyherald.com/{user.username} ↗
          </a>
        </p>
      </header>

      <ThemePicker themes={themes} currentThemeId={user.themeId} />

      <div className='mt-10'>
        <ProfileEditor profile={profile} />
      </div>
    </div>
  )
}
