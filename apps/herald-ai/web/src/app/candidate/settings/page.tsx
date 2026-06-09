import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { decryptVendorKeys } from '@atta/crypto'
import { getProviderKeys } from '@atta/db/queries'
import { ProfileEditor } from '@/components/portal/ProfileEditor'
import { db } from '@/db'
import { getUserByClerkId } from '@/db/queries'

export default async function CandidateSettingsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await getUserByClerkId(userId)
  if (!user?.onboardingComplete) redirect('/candidate')

  // Check if owner has a stored Anthropic key — passed to ProfileEditor for keyless-publish confirm
  let hasAnthropicKey = false
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
        hasAnthropicKey = !!keys.anthropic
      }
    } catch {
      hasAnthropicKey = false
    }
  }

  const profile = {
    name: user.name,
    title: user.title,
    location: user.location ?? '',
    availability: user.availability ?? '',
    github: user.githubHandle ?? '',
    linkedin: user.linkedinUrl ?? '',
    discord: user.discordHandle ?? '',
    summary: user.summary,
    stack: JSON.parse(user.stack) as string[],
    cvUrl: user.cvUrl ?? null,
    avatarUrl: user.avatarUrl ?? null,
    isPublished: user.isPublished,
    hasAnthropicKey
  }

  return (
    <div className='h-full overflow-y-auto'>
      <div className='mx-auto max-w-[700px] px-6 py-8'>
        <div className='mb-8'>
          <h1 className='font-serif text-xl tracking-tight'>Settings</h1>
          <p className='mt-1 font-mono text-xs text-muted-foreground'>Profile, API keys, and social connections.</p>
        </div>

        <ProfileEditor profile={profile} />
      </div>
    </div>
  )
}
