import { auth } from '@atta/auth/hooks'
import { CatalogProvider, getCatalog } from '@atta/models'
import { listPublicSpecs } from '@atta/engine'
import { getDailySessionCount, getOrCreateUser } from '@/db/queries'
import { getUserTeamModels } from '@/db/settings-queries'
import { getDailySessionLimit } from '@/schemas'
import { DeliberateSection } from './components/DeliberateSection'

export default async function DeliberatePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { userId: clerkId } = await auth()

  await getOrCreateUser(clerkId!, '')
  const [dailyCount, teamModels, catalog] = await Promise.all([
    getDailySessionCount(clerkId!),
    getUserTeamModels(clerkId!),
    getCatalog()
  ])
  const specs = listPublicSpecs()

  const dailyLimit = getDailySessionLimit()
  const remaining = dailyLimit - dailyCount
  const { error } = await searchParams

  // Provider keys live in the browser — the client reads them via useIdentity().
  // Passing [] keeps the prop shape while deferring the truth source to the browser.
  return (
    <CatalogProvider catalog={catalog}>
      <div className='mx-auto w-full max-w-5xl flex-1 pt-10 pb-4 px-6'>
        <DeliberateSection
          remainingToday={remaining}
          dailyLimit={dailyLimit}
          initialError={error}
          configuredProviders={[]}
          initialTeamModels={teamModels}
          specs={specs}
        />
      </div>
    </CatalogProvider>
  )
}
