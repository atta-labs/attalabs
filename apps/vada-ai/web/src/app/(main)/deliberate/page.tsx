import { auth } from '@atta/auth/hooks'
import { CatalogProvider, getCatalog } from '@atta/models'
import { listPublicSpecs } from '@atta/engine'
import { getDailySessionCount, getOrCreateUser } from '@/db/queries'
import { getUserTeamModels } from '@/db/settings-queries'
import { getDailySessionLimit } from '@/schemas'
import { getProviderKeys } from '@/db/keys-queries'
import { decryptVendorKeys } from '@atta/crypto'
import { DeliberateSection } from './components/DeliberateSection'

export default async function DeliberatePage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; team?: string }>
}) {
  const { userId: clerkId } = await auth()

  await getOrCreateUser(clerkId!, '')
  const [dailyCount, teamModels, catalog, providerRow] = await Promise.all([
    getDailySessionCount(clerkId!),
    getUserTeamModels(clerkId!),
    getCatalog(),
    getProviderKeys(clerkId!)
  ])
  const specs = listPublicSpecs()

  const dailyLimit = getDailySessionLimit()
  const remaining = dailyLimit - dailyCount
  const { error, team } = await searchParams

  let configuredProviders: string[] = []
  if (providerRow) {
    const masterKeyB64 = process.env.MASTER_ENCRYPTION_KEY
    if (masterKeyB64) {
      try {
        const masterKey = Buffer.from(masterKeyB64, 'base64')
        const decrypted = decryptVendorKeys(
          providerRow.encryptedPayload as Parameters<typeof decryptVendorKeys>[0],
          clerkId!,
          masterKey
        )
        configuredProviders = Object.keys(decrypted).filter((k) => Boolean(decrypted[k]))
      } catch {
        // decryption failed — fall back to empty
      }
    }
  }

  return (
    <CatalogProvider catalog={catalog}>
      <div className='mx-auto w-full max-w-5xl flex-1 pt-10 pb-4 px-6'>
        <DeliberateSection
          remainingToday={remaining}
          dailyLimit={dailyLimit}
          initialError={error}
          configuredProviders={configuredProviders}
          initialTeamModels={teamModels}
          specs={specs}
          initialTeamId={team}
        />
      </div>
    </CatalogProvider>
  )
}
