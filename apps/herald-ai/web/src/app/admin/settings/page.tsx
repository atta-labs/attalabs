import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ProfileEditor } from '@/components/portal/ProfileEditor'
import { getUserByClerkId } from '@/db/queries'

export default async function SettingsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await getUserByClerkId(userId)
  if (!user?.onboardingComplete) redirect('/admin')

  const profile = {
    name: user.name,
    title: user.title,
    location: user.location ?? '',
    availability: user.availability ?? '',
    github: user.githubHandle ?? '',
    summary: user.summary,
    stack: JSON.parse(user.stack) as string[]
  }

  return (
    <div className='mx-auto max-w-[700px] px-6 py-8'>
      <div className='mb-8'>
        <h1 className='font-display text-xl tracking-tight'>Settings</h1>
        <p className='mt-1 font-mono text-xs text-muted-foreground'>Profile, API keys, and social connections.</p>
      </div>

      <ProfileEditor profile={profile} />
    </div>
  )
}
