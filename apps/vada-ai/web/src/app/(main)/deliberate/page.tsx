import { auth } from '@atta/auth/hooks'
import { CatalogProvider, getCatalog } from '@atta/models'
import { redirect } from 'next/navigation'
import { getDailySessionCount, getOrCreateUser } from '@/db/queries'
import { getUserApiKeys, getUserTeamModels } from '@/db/settings-queries'
import { DAILY_SESSION_LIMIT } from '@/schemas'
import { DeliberateSection } from './components/DeliberateSection'

export default async function DeliberatePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/?signin=1')

  const user = await getOrCreateUser(clerkId, '')
  const [dailyCount, apiKeys, teamModels, catalog] = await Promise.all([
    getDailySessionCount(user.id),
    getUserApiKeys(user.id),
    getUserTeamModels(user.id),
    getCatalog()
  ])

  const remaining = DAILY_SESSION_LIMIT - dailyCount
  const { error } = await searchParams
  const configuredProviders = apiKeys.map((k) => k.provider)

  return (
    <CatalogProvider catalog={catalog}>
      <div className='mx-auto w-full max-w-5xl flex-1 pt-10 pb-4 px-6'>
        <DeliberateSection
          remainingToday={remaining}
          initialError={error}
          configuredProviders={configuredProviders}
          initialTeamModels={teamModels}
        />
      </div>
    </CatalogProvider>
  )
}
