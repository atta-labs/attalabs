import { auth } from '@atta/auth/hooks'
import { CatalogProvider, getCatalog } from '@atta/models'
import { redirect } from 'next/navigation'
import { getDailySessionCount, getOrCreateUser } from '@/db/queries'
import { getUserTeamModels } from '@/db/settings-queries'
import { DAILY_SESSION_LIMIT } from '@/schemas'
import { DeliberateSection } from './components/DeliberateSection'

export default async function DeliberatePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/?signin=1')

  const user = await getOrCreateUser(clerkId, '')
  const [dailyCount, teamModels, catalog] = await Promise.all([
    getDailySessionCount(user.id),
    getUserTeamModels(user.id),
    getCatalog()
  ])

  const remaining = DAILY_SESSION_LIMIT - dailyCount
  const { error } = await searchParams

  // Provider keys live in the browser — the client reads them via useIdentity().
  // Passing [] keeps the prop shape while deferring the truth source to the browser.
  return (
    <CatalogProvider catalog={catalog}>
      <div className='mx-auto w-full max-w-5xl flex-1 pt-10 pb-4 px-6'>
        <DeliberateSection
          remainingToday={remaining}
          initialError={error}
          configuredProviders={[]}
          initialTeamModels={teamModels}
        />
      </div>
    </CatalogProvider>
  )
}
