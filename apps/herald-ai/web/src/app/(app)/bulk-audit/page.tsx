import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { decryptVendorKeys } from '@atta/crypto'
import { getProviderKeys } from '@atta/db/queries'
import { db } from '@/db'
import { getUserByClerkId } from '@/db/queries'
import { BulkAudit } from '@/components/audit/BulkAudit'

export default async function BulkAuditPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await getUserByClerkId(userId)
  if (!user?.onboardingComplete) redirect('/onboarding')

  let hasKey = false
  const masterKeyB64 = process.env.MASTER_ENCRYPTION_KEY
  if (masterKeyB64) {
    try {
      const stored = await getProviderKeys(db, userId)
      if (stored) {
        const keys = decryptVendorKeys(
          stored.encryptedPayload as Parameters<typeof decryptVendorKeys>[0],
          userId,
          Buffer.from(masterKeyB64, 'base64')
        )
        hasKey = !!keys.anthropic
      }
    } catch {
      hasKey = false
    }
  }

  return (
    <div className='h-full overflow-y-auto'>
      <BulkAudit
        hasKey={hasKey}
        settingsHref={user.username ? `/${user.username}/settings?tab=api-keys` : '/onboarding'}
      />
    </div>
  )
}
