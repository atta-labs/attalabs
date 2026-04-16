import { auth } from '@atta/auth/hooks'
import { redirect } from 'next/navigation'
import { getDailySessionCount, getOrCreateUser } from '@/db/queries'
import { getUserApiKeys, getUserTeamModels } from '@/db/settings-queries'
import { DAILY_SESSION_LIMIT } from '@/schemas'
import { DeliberateSection } from './components/DeliberateSection'

export default async function DeliberatePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const user = await getOrCreateUser(clerkId, '')
  const [dailyCount, apiKeys, teamModels] = await Promise.all([
    getDailySessionCount(user.id),
    getUserApiKeys(user.id),
    getUserTeamModels(user.id)
  ])

  const remaining = DAILY_SESSION_LIMIT - dailyCount
  const { error } = await searchParams
  const configuredProviders = apiKeys.map((k) => k.provider)

  return (
    <div className='mx-auto w-full max-w-2xl flex-1 py-4 px-8'>
      <DeliberateSection
        remainingToday={remaining}
        initialError={error}
        configuredProviders={configuredProviders}
        initialTeamModels={teamModels}
      />
    </div>
  )
}
