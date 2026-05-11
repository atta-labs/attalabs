import { auth } from '@atta/auth/hooks'
import { CatalogProvider, getCatalog, VENDOR_ORDER } from '@atta/models'
import { listPublicSpecs } from '@atta/engine'
import { getDailySessionCount, getOrCreateUser } from '@/db/queries'
import { getDailySessionLimit } from '@/schemas'
import { getProviderKeys } from '@atta/db/queries'
import { db } from '@/db'
import { decryptVendorKeys } from '@atta/crypto'
import { DeliberateSection } from './components/DeliberateSection'

export default async function DeliberatePage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; team?: string }>
}) {
  const { userId: clerkId } = await auth()

  await getOrCreateUser(clerkId!, '')
  const [dailyCount, catalog, providerRow] = await Promise.all([
    getDailySessionCount(clerkId!),
    getCatalog(),
    getProviderKeys(db, clerkId!)
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
        // Intersect with current RouteProvider set so orphan vendors from prior
        // schema versions (e.g. xAI before it routed via OpenRouter) don't leak
        // into the UI as "configured" — Settings can no longer manage them.
        const validVendors: ReadonlySet<string> = new Set(VENDOR_ORDER)
        configuredProviders = Object.keys(decrypted).filter((k) => Boolean(decrypted[k]) && validVendors.has(k))
      } catch {
        // decryption failed — fall back to empty
      }
    }
  }

  return (
    <CatalogProvider catalog={catalog} className='h-full flex flex-col justify-center'>
      <div className='mx-auto w-full max-w-5xl px-6'>
        <DeliberateSection
          remainingToday={remaining}
          dailyLimit={dailyLimit}
          initialError={error}
          configuredProviders={configuredProviders}
          specs={specs}
          initialTeamId={team}
        />
      </div>
    </CatalogProvider>
  )
}
